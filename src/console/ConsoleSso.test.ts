import { describe, expect, it, vi } from "vitest";
import type { ConsoleSsoRequest, ConsoleSsoTransport } from "./ConsoleSso";
import { ConsoleSessionError } from "./ConsoleSessionError";
import { completeCognitoSignIn } from "./completeCognitoSignIn";
import { readCognitoAvailability } from "./readCognitoAvailability";
import { requestConsoleSso } from "./requestConsoleSso";
import { signOutConsoleSso } from "./signOutConsoleSso";
import { startCognitoSignIn } from "./startCognitoSignIn";
import { withBrowserMarkerLock } from "./withBrowserMarkerLock";

const session = { accountId: "account-1", username: "cognito-user", mustChangePassword: false, absoluteExpiresAt: "2026-11-07T12:00:00Z" };

function fakeLocks() {
  const state = { held: false, names: [] as string[], modes: [] as (string | undefined)[] };
  const locks = {
    request: vi.fn(async (name: string, options: LockOptions, run: () => Promise<unknown>) => {
      state.names.push(name);
      state.modes.push(options.mode);
      state.held = true;
      try {
        return await run();
      } finally {
        state.held = false;
      }
    }),
  } as unknown as LockManager;
  return { locks, state };
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function recordingTransport(state: { held: boolean }, responses: Response[]) {
  const calls: { request: ConsoleSsoRequest; locked: boolean }[] = [];
  const transport: ConsoleSsoTransport = async (request) => {
    calls.push({ request, locked: state.held });
    const response = responses.shift();
    if (!response) throw new Error("unexpected request");
    return response;
  };
  return { transport, calls };
}

describe("withBrowserMarkerLock", () => {
  it("refuses SSO without Web Locks and uses one exclusive named lock", async () => {
    await expect(withBrowserMarkerLock(undefined, async () => 1)).rejects.toMatchObject({ code: "sso_unsupported" });
    const { locks, state } = fakeLocks();
    expect(await withBrowserMarkerLock(locks, async () => 7)).toBe(7);
    expect(state.names).toEqual(["kafka3o-browser-marker"]);
    expect(state.modes).toEqual(["exclusive"]);
  });
});

describe("startCognitoSignIn", () => {
  it("ensures the marker and starts the attempt while holding the lock", async () => {
    const { locks, state } = fakeLocks();
    const { transport, calls } = recordingTransport(state, [
      new Response(null, { status: 204 }),
      json(200, { authorizationUrl: "https://login.example/oauth2/authorize?state=s" }),
    ]);
    expect(await startCognitoSignIn(transport, locks)).toBe("https://login.example/oauth2/authorize?state=s");
    expect(calls.map((call) => [call.request.method, call.request.path, call.locked])).toEqual([
      ["POST", "/api/session/browser", true],
      ["POST", "/api/session/cognito/start", true],
    ]);
  });

  it("rejects unsafe provider URLs and unexpected ensure results", async () => {
    for (const authorizationUrl of ["http://login.example/oauth2/authorize", "javascript:alert(1)", "https://user:pw@login.example/", 7]) {
      const { locks, state } = fakeLocks();
      const { transport } = recordingTransport(state, [new Response(null, { status: 204 }), json(200, { authorizationUrl })]);
      await expect(startCognitoSignIn(transport, locks)).rejects.toMatchObject({ code: "invalid_response" });
    }
    const { locks, state } = fakeLocks();
    const { transport, calls } = recordingTransport(state, [new Response(null, { status: 200 })]);
    await expect(startCognitoSignIn(transport, locks)).rejects.toMatchObject({ code: "outcome_unknown" });
    expect(calls).toHaveLength(1);
  });
});

describe("completeCognitoSignIn", () => {
  it("posts the raw callback query once under the lock and parses the session", async () => {
    const { locks, state } = fakeLocks();
    const { transport, calls } = recordingTransport(state, [json(200, session)]);
    expect(await completeCognitoSignIn(transport, locks, "?code=abc&state=xyz")).toEqual(session);
    expect(calls).toEqual([{ request: { method: "POST", path: "/api/session/cognito/callback", body: { query: "code=abc&state=xyz" } }, locked: true }]);
  });

  it("rejects an empty or oversized query without sending it", async () => {
    const { locks, state } = fakeLocks();
    const { transport, calls } = recordingTransport(state, []);
    for (const query of ["", "?", "?" + "x".repeat(8193)]) {
      await expect(completeCognitoSignIn(transport, locks, query)).rejects.toMatchObject({ code: "sign_in_failed" });
    }
    expect(calls).toHaveLength(0);
  });
});

describe("signOutConsoleSso", () => {
  it("returns the provider logout URL for Cognito sessions and nothing for local ones", async () => {
    const { locks, state } = fakeLocks();
    const { transport, calls } = recordingTransport(state, [
      json(200, { providerLogoutUrl: "https://login.example/logout?client_id=c&logout_uri=https%3A%2F%2Fconsole.example%2F" }),
      new Response(null, { status: 204 }),
    ]);
    expect(await signOutConsoleSso(transport, locks)).toBe("https://login.example/logout?client_id=c&logout_uri=https%3A%2F%2Fconsole.example%2F");
    expect(await signOutConsoleSso(transport, locks)).toBeNull();
    expect(calls.every((call) => call.locked && call.request.csrf === true && call.request.path === "/api/session/logout")).toBe(true);
  });
});

describe("readCognitoAvailability", () => {
  it("offers SSO only with Web Locks and an available provider", async () => {
    const transport = vi.fn<ConsoleSsoTransport>().mockResolvedValue(json(200, { available: true }));
    expect(await readCognitoAvailability(transport, undefined)).toBe(false);
    expect(transport).not.toHaveBeenCalled();
    const { locks } = fakeLocks();
    expect(await readCognitoAvailability(transport, locks)).toBe(true);
    transport.mockResolvedValueOnce(json(200, { available: false }));
    expect(await readCognitoAvailability(transport, locks)).toBe(false);
    transport.mockRejectedValueOnce(new ConsoleSessionError("request_rejected", 404));
    expect(await readCognitoAvailability(transport, locks)).toBe(false);
  });
});

describe("requestConsoleSso", () => {
  it("sends same-origin requests without an abort signal and maps SSO problems", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }));
    await requestConsoleSso(fetchFn, "https://console.example", () => "", { method: "POST", path: "/api/session/browser" });
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe("https://console.example/api/session/browser");
    expect(init).toMatchObject({ method: "POST", credentials: "same-origin", mode: "same-origin", redirect: "error", cache: "no-store" });
    expect(init?.signal).toBeUndefined();
    for (const [status, code, mapped] of [
      [503, "sso_unavailable", "sso_unavailable"], [401, "sign_in_failed", "sign_in_failed"], [401, "sign_in_denied", "sign_in_denied"],
      [400, "invalid_callback", "sign_in_failed"], [409, "invalid_browser_marker", "browser_verification_failed"],
      [409, "already_signed_in", "already_signed_in"], [429, "sign_in_throttled", "authentication_throttled"],
      [503, "session_service_unavailable", "outcome_unknown"], [404, "not_found", "request_rejected"],
    ] as const) {
      fetchFn.mockResolvedValueOnce(json(status, { status, code, title: "x" }));
      await expect(requestConsoleSso(fetchFn, "https://console.example", () => "", { method: "POST", path: "/api/session/cognito/start" }))
        .rejects.toMatchObject({ code: mapped, status });
    }
    fetchFn.mockRejectedValueOnce(new TypeError("network"));
    await expect(requestConsoleSso(fetchFn, "https://console.example", () => "", { method: "POST", path: "/api/session/cognito/callback" }))
      .rejects.toMatchObject({ code: "outcome_unknown" });
  });

  it("requires a verified HTTPS origin and adds CSRF only when asked", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }));
    await expect(requestConsoleSso(fetchFn, "http://console.example", () => "", { method: "POST", path: "/api/session/browser" }))
      .rejects.toMatchObject({ code: "insecure_origin" });
    const csrf = "A".repeat(42) + "A";
    await requestConsoleSso(fetchFn, "https://console.example", () => `__Host-kafka3o_csrf=${csrf}`, { method: "POST", path: "/api/session/logout", csrf: true });
    expect(new Headers(fetchFn.mock.calls[0][1]?.headers).get("X-Kafka3O-CSRF")).toBe(csrf);
  });
});
