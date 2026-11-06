import { getByLabelText, screen } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { request, type RequestOptions } from "node:https";
import { resolve } from "node:path";
import process from "node:process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { consolePreviewFetch, type PreviewCookieJar } from "../test/consolePreviewFetch";
import { consolePreviewHttps } from "../test/consolePreviewHttps";
import { server } from "../test/server";

declare const jsdom: {
  reconfigure: (options: { url: string }) => void;
  cookieJar: PreviewCookieJar & {
    getCookiesSync: (url: string, options: { http: true }) => {
      key: string;
      secure: boolean;
      httpOnly: boolean;
      path: string;
      sameSite?: string;
      hostOnly?: boolean;
    }[];
    removeAllCookiesSync: () => void;
  };
};

describe.skipIf(process.env.KAFKA3O_PREVIEW_INTEGRATION !== "1")("built Console preview over verified HTTPS", () => {
  let fixture: Awaited<ReturnType<typeof consolePreviewHttps>> | undefined;
  const originalFetch = window.fetch;

  beforeAll(async () => {
    server.close();
    const gateway = process.env.KAFKA3O_GATEWAY_DIR ?? resolve(process.cwd(), "..", "Kafka3O-Gateway");
    fixture = await consolePreviewHttps(gateway, resolve(process.cwd(), "dist"));
    jsdom.reconfigure({ url: `${fixture.origin}/` });
  }, 120_000);

  afterAll(async () => {
    window.fetch = originalFetch;
    jsdom.cookieJar.removeAllCookiesSync();
    jsdom.reconfigure({ url: "http://localhost:3000/" });
    try {
      if (fixture) await fixture.close();
    } finally {
      server.listen({ onUnhandledFrame: "error" });
    }
  }, 20_000);

  it("verifies TLS and exercises the built UI against the bootstrapped session API without Gateway requests", async () => {
    if (!fixture) throw new Error("The Console fixture did not start");
    const { origin, ca } = fixture;
    const probe = (options: RequestOptions) => new Promise<number>((resolveProbe, reject) => {
      const outgoing = request(`${origin}/`, { ...options, agent: false }, (incoming) => {
        incoming.resume();
        resolveProbe(incoming.statusCode ?? 0);
      });
      outgoing.once("error", reject);
      outgoing.end();
    });
    await expect(probe({})).rejects.toMatchObject({
      code: expect.stringMatching(/UNABLE_TO_VERIFY_LEAF_SIGNATURE|UNABLE_TO_GET_ISSUER_CERT_LOCALLY/),
    });
    await expect(probe({ ca, servername: "wrong.invalid" })).rejects.toMatchObject({ code: "ERR_TLS_CERT_ALTNAME_INVALID" });
    expect(await probe({ ca })).toBe(200);

    const network = consolePreviewFetch(origin, ca, jsdom.cookieJar);
    const html = await network.fetch(`${origin}/`);
    expect(html.status).toBe(200);
    const page = new DOMParser().parseFromString(await html.text(), "text/html");
    const script = page.querySelector<HTMLScriptElement>('script[type="module"][src^="/assets/"]');
    const stylesheet = page.querySelector<HTMLLinkElement>('link[rel="stylesheet"][href^="/assets/"]');
    if (!script || !stylesheet) throw new Error("The built preview has no same-origin bundle and stylesheet");
    const scriptPath = script.getAttribute("src");
    const stylesheetPath = stylesheet.getAttribute("href");
    if (!scriptPath || !stylesheetPath) throw new Error("The built preview assets have no paths");
    const [bundle, css] = await Promise.all([
      network.fetch(new URL(scriptPath, origin).href),
      network.fetch(new URL(stylesheetPath, origin).href),
    ]);
    expect(bundle.status).toBe(200);
    expect(css.status).toBe(200);
    document.body.innerHTML = '<div id="root"></div>';
    window.fetch = network.fetch;
    window.eval(await bundle.text());

    const user = userEvent.setup();
    await user.type(await screen.findByLabelText("Username"), "admin");
    await user.type(screen.getByLabelText("Password"), "incorrect passphrase");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect((await screen.findByRole("alert")).textContent).toContain("not accepted");
    expect((getByLabelText(document.body, "Password") as HTMLInputElement).value).toBe("");

    await user.type(screen.getByLabelText("Password"), "initial passphrase");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("heading", { name: "Change your password" })).toBeDefined();
    const cookies = jsdom.cookieJar.getCookiesSync(origin, { http: true });
    expect(cookies.some((cookie) => cookie.key === "__Host-kafka3o_session" && cookie.secure && cookie.httpOnly &&
      cookie.path === "/" && cookie.hostOnly && cookie.sameSite === "strict")).toBe(true);
    expect(cookies.some((cookie) => cookie.key === "__Host-kafka3o_csrf" && cookie.secure && !cookie.httpOnly &&
      cookie.path === "/" && cookie.hostOnly && cookie.sameSite === "strict")).toBe(true);
    expect(document.cookie.includes("__Host-kafka3o_session=")).toBe(false);
    expect(document.cookie.includes("__Host-kafka3o_csrf=")).toBe(true);

    await user.type(screen.getByLabelText("Current password"), "initial passphrase");
    await user.type(screen.getByLabelText("New password"), "replacement passphrase");
    await user.type(screen.getByLabelText("Confirm new password"), "replacement passphrase");
    await user.click(screen.getByRole("button", { name: "Change password" }));
    expect((await screen.findByRole("status")).textContent).toContain("Sign in again");

    await user.type(screen.getByLabelText("Password"), "replacement passphrase");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("heading", { name: "Signed in" })).toBeDefined();
    expect(screen.queryByRole("link", { name: "Clusters" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect(await screen.findByText("You are signed out.")).toBeDefined();
    expect((await network.fetch(`${origin}/api/session`, {
      credentials: "same-origin", cache: "no-store", redirect: "error",
    })).status).toBe(401);

    const allowed = new Set([
      "GET /", `GET ${scriptPath}`, `GET ${stylesheetPath}`, "GET /api/session",
      "POST /api/session/local", "POST /api/session/password", "POST /api/session/logout",
    ]);
    expect(network.requests.filter((item) => item.origin !== origin || !allowed.has(`${item.method} ${item.path}`))).toEqual([]);
    expect(network.requests.filter((item) => item.path.startsWith("/api/") &&
      (item.credentials !== "same-origin" || item.cache !== "no-store" || item.redirect !== "error"))).toEqual([]);
    expect(network.requests.filter((item) => item.method === "POST" && item.path === "/api/session/local")).toHaveLength(3);
    expect(network.requests.filter((item) => item.method === "POST" && item.path === "/api/session/password")).toHaveLength(1);
    expect(network.requests.filter((item) => item.method === "POST" && item.path === "/api/session/logout")).toHaveLength(1);
  }, 30_000);
});
