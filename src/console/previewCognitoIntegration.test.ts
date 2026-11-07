import type { Buffer } from "node:buffer";
import { request } from "node:https";
import { resolve } from "node:path";
import process from "node:process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { consolePreviewFetch, type PreviewCookieJar } from "../test/consolePreviewFetch";
import { consolePreviewHttps } from "../test/consolePreviewHttps";
import { server } from "../test/server";

declare const jsdom: {
  cookieJar: PreviewCookieJar & { cloneSync: () => PreviewCookieJar | undefined; removeAllCookiesSync: () => void };
};

const gateway = process.env.KAFKA3O_GATEWAY_DIR ?? resolve(process.cwd(), "..", "Kafka3O-Gateway");
const enabled = process.env.KAFKA3O_PREVIEW_INTEGRATION === "1";
const wait = (ms: number) => new Promise((done) => setTimeout(done, ms));

function providerRedirect(url: string, ca: Buffer): Promise<URL> {
  return new Promise((done, reject) => {
    const outgoing = request(url, { ca, rejectUnauthorized: true, agent: false }, (incoming) => {
      incoming.resume();
      const location = incoming.headers.location;
      if (incoming.statusCode !== 302 || !location) reject(new Error(`provider did not redirect: ${incoming.statusCode}`));
      else done(new URL(location));
    });
    outgoing.once("error", reject);
    outgoing.end();
  });
}

function cookieValues(jar: PreviewCookieJar, origin: string): string[] {
  return jar.getCookieStringSync(`${origin}/`, { http: true }).split(";").map((part) => part.trim().split("=")[1] ?? "").filter(Boolean);
}

function csrfHeader(jar: PreviewCookieJar, origin: string): Record<string, string> {
  const match = /(?:^|;\s*)__Host-kafka3o_csrf=([^;]+)/.exec(jar.getCookieStringSync(`${origin}/`, { http: true }));
  return match ? { "X-Kafka3O-CSRF": match[1] } : {};
}

async function waitForSso(fetch: typeof globalThis.fetch, origin: string, expected: boolean) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const response = await fetch(`${origin}/api/session/cognito`, { cache: "no-store", redirect: "error" });
    const body = await response.json() as { available?: boolean };
    if (body.available === expected) return;
    await wait(250);
  }
  throw new Error(`Cognito availability never became ${expected}`);
}

const json = (body: unknown): RequestInit => ({
  method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" }, cache: "no-store", redirect: "error",
});
const post: RequestInit = { method: "POST", cache: "no-store", redirect: "error" };

describe.skipIf(!enabled)("built Console preview with a synthetic Cognito provider", () => {
  let fixture: Awaited<ReturnType<typeof consolePreviewHttps>> | undefined;

  beforeAll(async () => {
    server.close();
    fixture = await consolePreviewHttps(gateway, resolve(process.cwd(), "dist"), { KAFKA3O_TEST_CONSOLE_PREVIEW_COGNITO: "synthetic" });
  }, 120_000);

  afterAll(async () => {
    try {
      if (fixture) await fixture.close();
    } finally {
      server.listen({ onUnhandledFrame: "error" });
    }
  }, 20_000);

  it("signs in through the provider redirect, refreshes, denies replay and signs out without leaking secrets", async () => {
    if (!fixture?.providerCA) throw new Error("The Cognito fixture did not start");
    const { origin, ca, providerCA } = fixture;
    jsdom.cookieJar.removeAllCookiesSync();
    const jar = jsdom.cookieJar.cloneSync();
    if (!jar) throw new Error("Could not create an isolated cookie jar");
    const { fetch, requests } = consolePreviewFetch(origin, ca, jar);
    await waitForSso(fetch, origin, true);

    expect((await fetch(`${origin}/api/session/browser`, post)).status).toBe(204);
    const started = await fetch(`${origin}/api/session/cognito/start`, post);
    expect(started.status).toBe(200);
    const { authorizationUrl } = await started.json() as { authorizationUrl: string };
    const callback = await providerRedirect(authorizationUrl, providerCA);
    expect(callback.origin + callback.pathname).toBe(`${origin}/auth/cognito/callback`);
    const code = callback.searchParams.get("code") ?? "";
    const state = callback.searchParams.get("state") ?? "";

    const landing = await fetch(`${origin}/auth/cognito/callback${callback.search}`, { cache: "no-store", redirect: "error" });
    expect(landing.status).toBe(200);
    expect(await landing.text()).toContain('id="root"');

    const completed = await fetch(`${origin}/api/session/cognito/callback`, json({ query: callback.search.slice(1) }));
    expect(completed.status).toBe(200);
    expect(await completed.json()).toMatchObject({ authSource: "cognito" });
    expect((await fetch(`${origin}/api/session`, { cache: "no-store", redirect: "error" })).status).toBe(200);
    const sessionSecrets = cookieValues(jar, origin);

    const replay = await fetch(`${origin}/api/session/cognito/callback`, json({ query: callback.search.slice(1) }));
    expect(replay.status).toBe(409);
    const forged = await fetch(`${origin}/api/session/cognito/callback`, json({ query: `code=${code}&state=${"A".repeat(43)}` }));
    expect(forged.status).toBe(409);

    await wait(9_000);
    expect((await fetch(`${origin}/api/session`, { cache: "no-store", redirect: "error" })).status).toBe(200);

    const signedOut = await fetch(`${origin}/api/session/logout`, { ...post, headers: csrfHeader(jar, origin) });
    expect(signedOut.status).toBe(200);
    const { providerLogoutUrl } = await signedOut.json() as { providerLogoutUrl: string };
    expect(new URL(providerLogoutUrl).pathname).toBe("/logout");
    expect(new URL(providerLogoutUrl).searchParams.get("logout_uri")).toBe(`${origin}/`);
    expect((await fetch(`${origin}/api/session`, { cache: "no-store", redirect: "error" })).status).toBe(401);
    const stale = await fetch(`${origin}/api/session/cognito/callback`, json({ query: callback.search.slice(1) }));
    expect(stale.status).toBe(401);

    const local = await fetch(`${origin}/api/session/local`, json({ username: "admin", password: "initial passphrase" }));
    expect(local.status).toBe(200);
    expect(await local.json()).toMatchObject({ authSource: "local", mustChangePassword: true });

    expect(requests.every((entry) => entry.origin === origin && (entry.path.startsWith("/api/session") || entry.path === "/auth/cognito/callback"))).toBe(true);
    const logs = fixture.logs();
    for (const secret of [code, state, "synthetic-client-secret-value", ...sessionSecrets]) {
      expect(secret.length).toBeGreaterThan(0);
      expect(logs).not.toContain(secret);
    }
  }, 60_000);
});

describe.skipIf(!enabled)("built Console preview during a Cognito provider outage", () => {
  let fixture: Awaited<ReturnType<typeof consolePreviewHttps>> | undefined;

  beforeAll(async () => {
    server.close();
    fixture = await consolePreviewHttps(gateway, resolve(process.cwd(), "dist"), { KAFKA3O_TEST_CONSOLE_PREVIEW_COGNITO: "synthetic-outage" });
  }, 120_000);

  afterAll(async () => {
    try {
      if (fixture) await fixture.close();
    } finally {
      server.listen({ onUnhandledFrame: "error" });
    }
  }, 20_000);

  it("reports SSO unavailable and keeps local sign-in working", async () => {
    if (!fixture) throw new Error("The Cognito outage fixture did not start");
    const { origin, ca } = fixture;
    jsdom.cookieJar.removeAllCookiesSync();
    const jar = jsdom.cookieJar.cloneSync();
    if (!jar) throw new Error("Could not create an isolated cookie jar");
    const { fetch } = consolePreviewFetch(origin, ca, jar);
    await wait(1_500);
    await waitForSso(fetch, origin, false);
    expect((await fetch(`${origin}/api/session/browser`, post)).status).toBe(204);
    const started = await fetch(`${origin}/api/session/cognito/start`, post);
    expect(started.status).toBe(503);
    expect(await started.json()).toMatchObject({ code: "sso_unavailable" });
    const local = await fetch(`${origin}/api/session/local`, json({ username: "admin", password: "initial passphrase" }));
    expect(local.status).toBe(200);
    expect(fixture.logs()).toContain("Cognito sign-in unavailable");
  }, 60_000);
});
