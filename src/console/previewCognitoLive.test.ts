import { resolve } from "node:path";
import process from "node:process";
import { chromium } from "@playwright/test";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { consolePreviewFetch, type PreviewCookieJar } from "../test/consolePreviewFetch";
import { consolePreviewHttps } from "../test/consolePreviewHttps";
import { server } from "../test/server";

declare const jsdom: {
  cookieJar: PreviewCookieJar & { cloneSync: () => PreviewCookieJar | undefined; removeAllCookiesSync: () => void };
};

// Opt-in: requires KAFKA3O_LIVE_COGNITO=1, every KAFKA3O_CONSOLE_COGNITO_* setting for a test-only User Pool
// whose app client allows https://localhost:8443/auth/cognito/callback, and
// KAFKA3O_LIVE_COGNITO_USERNAME / KAFKA3O_LIVE_COGNITO_PASSWORD for a test user. Nothing is printed.
const live = process.env.KAFKA3O_LIVE_COGNITO === "1";
const gateway = process.env.KAFKA3O_GATEWAY_DIR ?? resolve(process.cwd(), "..", "Kafka3O-Gateway");
const wait = (ms: number) => new Promise((done) => setTimeout(done, ms));
const post: RequestInit = { method: "POST", cache: "no-store", redirect: "error" };
const json = (body: unknown): RequestInit => ({ ...post, body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });

describe.skipIf(!live)("built Console preview with the live test Cognito User Pool", () => {
  let fixture: Awaited<ReturnType<typeof consolePreviewHttps>> | undefined;

  beforeAll(async () => {
    server.close();
    fixture = await consolePreviewHttps(gateway, resolve(process.cwd(), "dist"), { KAFKA3O_TEST_CONSOLE_PREVIEW_COGNITO: "environment" });
  }, 120_000);

  afterAll(async () => {
    try {
      if (fixture) await fixture.close();
    } finally {
      server.listen({ onUnhandledFrame: "error" });
    }
  }, 20_000);

  it("signs in through managed login, uses and signs out a bound session", async () => {
    if (!fixture) throw new Error("The live Cognito fixture did not start");
    const { origin, ca } = fixture;
    const username = process.env.KAFKA3O_LIVE_COGNITO_USERNAME ?? "";
    const password = process.env.KAFKA3O_LIVE_COGNITO_PASSWORD ?? "";
    const loginHost = new URL(process.env.KAFKA3O_CONSOLE_COGNITO_AUTHORIZATION_URL ?? "https://invalid.example").host;
    jsdom.cookieJar.removeAllCookiesSync();
    const jar = jsdom.cookieJar.cloneSync();
    if (!jar || !username || !password) throw new Error("Live Cognito settings are incomplete");
    const { fetch } = consolePreviewFetch(origin, ca, jar);
    let available = false;
    for (let attempt = 0; attempt < 60 && !available; attempt += 1) {
      available = ((await (await fetch(`${origin}/api/session/cognito`, { cache: "no-store", redirect: "error" })).json()) as { available?: boolean }).available === true;
      if (!available) await wait(500);
    }
    expect(available).toBe(true);

    expect((await fetch(`${origin}/api/session/browser`, post)).status).toBe(204);
    const started = await fetch(`${origin}/api/session/cognito/start`, post);
    expect(started.status).toBe(200);
    const { authorizationUrl } = await started.json() as { authorizationUrl: string };
    expect(new URL(authorizationUrl).host).toBe(loginHost);

    const browser = await chromium.launch();
    let intercepted: URL | undefined;
    try {
      const page = await browser.newPage();
      // The browser never connects to the Console: its redirects are captured and completed over verified TLS below.
      await page.route((url) => url.origin === origin, async (route) => {
        intercepted = new URL(route.request().url());
        await route.fulfill({ status: 200, contentType: "text/plain", body: "captured" });
      });
      await page.goto(authorizationUrl);
      await page.locator('input[name="username"]').first().fill(username);
      const passwordField = page.locator('input[name="password"]').first();
      if (!(await passwordField.isVisible().catch(() => false))) {
        await page.locator('button[type="submit"]').first().click();
        await passwordField.waitFor({ timeout: 15_000 });
      }
      await passwordField.fill(password);
      await page.locator('button[type="submit"]').first().click();
      for (let attempt = 0; attempt < 120 && !intercepted; attempt += 1) await wait(250);
      const callback = intercepted;
      if (!callback) throw new Error("Managed login did not redirect to the Console callback");
      expect(callback.pathname).toBe("/auth/cognito/callback");
      const code = callback.searchParams.get("code") ?? "";
      const state = callback.searchParams.get("state") ?? "";

      const completed = await fetch(`${origin}/api/session/cognito/callback`, json({ query: callback.search.slice(1) }));
      expect(completed.status).toBe(200);
      expect(await completed.json()).toMatchObject({ authSource: "cognito" });
      expect((await fetch(`${origin}/api/session`, { cache: "no-store", redirect: "error" })).status).toBe(200);
      const credentials = jar.getCookieStringSync(`${origin}/`, { http: true }).split(";").map((part) => part.trim().split("=")[1] ?? "").filter(Boolean);
      const csrf = /(?:^|;\s*)__Host-kafka3o_csrf=([^;]+)/.exec(jar.getCookieStringSync(`${origin}/`, { http: true }))?.[1] ?? "";

      const signedOut = await fetch(`${origin}/api/session/logout`, { ...post, headers: { "X-Kafka3O-CSRF": csrf } });
      expect(signedOut.status).toBe(200);
      const { providerLogoutUrl } = await signedOut.json() as { providerLogoutUrl: string };
      expect(new URL(providerLogoutUrl).host).toBe(loginHost);
      expect((await fetch(`${origin}/api/session`, { cache: "no-store", redirect: "error" })).status).toBe(401);
      expect((await fetch(`${origin}/api/session/cognito/callback`, json({ query: callback.search.slice(1) }))).status).toBe(401);

      // Cognito answers /logout with an HTTP redirect, which route handlers do not see; fetch it without
      // following the redirect, keep its Set-Cookie headers, and check where it would send the browser.
      let logoutRedirect: string | undefined;
      const logoutEndpoint = new URL(providerLogoutUrl);
      await page.route((url) => url.origin === logoutEndpoint.origin && url.pathname === "/logout", async (route) => {
        const response = await route.fetch({ maxRedirects: 0 });
        logoutRedirect = response.headers().location;
        const headers = { ...response.headers() };
        delete headers.location;
        await route.fulfill({ status: 200, headers, body: "signed out" });
      });
      await page.goto(providerLogoutUrl);
      expect(logoutRedirect).toBe(`${origin}/`);

      const logs = fixture.logs();
      for (const secret of [code, state, password, process.env.KAFKA3O_CONSOLE_COGNITO_CLIENT_SECRET ?? "", ...credentials]) {
        expect(secret.length).toBeGreaterThan(0);
        expect(logs).not.toContain(secret);
      }
    } finally {
      await browser.close();
    }
  }, 120_000);
});
