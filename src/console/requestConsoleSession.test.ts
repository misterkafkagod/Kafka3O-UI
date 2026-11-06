import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { server } from "../test/server";
import type { ConsoleSessionOperation } from "./ConsoleSession";
import { requestConsoleSession } from "./requestConsoleSession";

describe("requestConsoleSession", () => {
  const origin = "https://console.example";
  const token = "A".repeat(43);
  const cookies = () => `other=value; __Host-kafka3o_csrf=${token}`;

  it("uses fixed same-origin HTTPS paths, cookie credentials and no redirects or caching", async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => Response.json({}));
    const readCookies = vi.fn(cookies);
    const cases: { operation: ConsoleSessionOperation; path: string; method: string; csrf: boolean; body?: object }[] = [
      { operation: { kind: "inspect" }, path: "/api/session", method: "GET", csrf: false },
      { operation: { kind: "login", username: "admin", password: "example password" }, path: "/api/session/local",
        method: "POST", csrf: false, body: { username: "admin", password: "example password" } },
      { operation: { kind: "changePassword", currentPassword: "old password", newPassword: "new password" },
        path: "/api/session/password", method: "POST", csrf: true,
        body: { currentPassword: "old password", newPassword: "new password" } },
      { operation: { kind: "logout" }, path: "/api/session/logout", method: "POST", csrf: true },
    ];
    for (const [index, item] of cases.entries()) {
      await requestConsoleSession(fetchFn, origin, readCookies, 5000, item.operation);
      const [url, init] = fetchFn.mock.calls[index];
      expect(url).toBe(origin + item.path);
      expect(init?.method).toBe(item.method);
      expect(init?.credentials).toBe("same-origin");
      expect(init?.mode).toBe("same-origin");
      expect(init?.redirect).toBe("error");
      expect(init?.cache).toBe("no-store");
      expect(init?.referrerPolicy).toBe("no-referrer");
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      const headers = new Headers(init?.headers);
      expect(headers.get("Accept")).toBe("application/json");
      expect(headers.has("Authorization")).toBe(false);
      expect(headers.get("X-Kafka3O-CSRF")).toBe(item.csrf ? token : null);
      expect(headers.get("Content-Type")).toBe(item.body ? "application/json" : null);
      expect(init?.body).toBe(item.body ? JSON.stringify(item.body) : undefined);
      expect(String(url)).not.toContain("example%20password");
      expect(String(url)).not.toContain(token);
    }
    expect(readCookies).toHaveBeenCalledTimes(2);
  });

  it("blocks insecure or non-origin URLs and invalid timeouts before accessing cookies or the network", async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => Response.json({}));
    const readCookies = vi.fn(cookies);
    for (const unsafe of ["http://localhost:5173", "http://console.example", "https://user:pass@console.example",
      "https://console.example/path", "https://console.example?token=x", "https://console.example#fragment", "not a URL"]) {
      await expect(requestConsoleSession(fetchFn, unsafe, readCookies, 5000, { kind: "logout" }))
        .rejects.toMatchObject({ code: "insecure_origin" });
    }
    for (const timeout of [0, -1, 60_001, Number.NaN, 1.5]) {
      await expect(requestConsoleSession(fetchFn, origin, readCookies, timeout, { kind: "logout" }))
        .rejects.toMatchObject({ code: "invalid_configuration" });
    }
    expect(fetchFn).not.toHaveBeenCalled();
    expect(readCookies).not.toHaveBeenCalled();
  });

  it("rejects missing, duplicated or inaccessible CSRF cookies before a mutation", async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => Response.json({}));
    for (const readCookies of [
      () => "",
      () => `__Host-kafka3o_csrf=${token}; __Host-kafka3o_csrf=${token}`,
      () => { throw new Error("sensitive cookie failure"); },
    ]) {
      await expect(requestConsoleSession(fetchFn, origin, readCookies, 5000, { kind: "logout" }))
        .rejects.toMatchObject({ code: "csrf_unavailable" });
    }
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("maps known problem codes without exposing untrusted problem details", async () => {
    for (const [status, code, expected] of [
      [401, "unauthorized", "unauthorized"],
      [401, "authentication_failed", "authentication_failed"],
      [429, "authentication_throttled", "authentication_throttled"],
      [409, "already_signed_in", "already_signed_in"],
      [400, "invalid_password", "invalid_password"],
      [400, "invalid_request", "invalid_request"],
      [403, "csrf_rejected", "csrf_rejected"],
      [403, "password_change_required", "password_change_required"],
      [403, "untrusted-sensitive-value", "request_rejected"],
    ] as const) {
      const fetchFn = vi.fn<typeof fetch>(async () =>
        Response.json({ status, code, detail: "sensitive-detail" }, { status }));
      const error = await requestConsoleSession(fetchFn, origin, cookies, 5000, { kind: "inspect" }).catch((failure: unknown) => failure);
      expect(error).toMatchObject({ code: expected, status });
      expect(String(error)).not.toContain("sensitive");
    }
  });

  it("reports failed or malformed mutation responses as unknown without retries", async () => {
    const operation: ConsoleSessionOperation = { kind: "changePassword", currentPassword: "old", newPassword: "new" };
    for (const fetchFn of [
      vi.fn<typeof fetch>(async () => { throw new Error("sensitive transport detail"); }),
      vi.fn<typeof fetch>(async () => Response.json({ status: 503, code: "session_service_unavailable" }, { status: 503 })),
      vi.fn<typeof fetch>(async () => new Response("sensitive invalid response", { status: 400 })),
      vi.fn<typeof fetch>(async () => Response.json({ status: 401, code: "unauthorized" }, { status: 403 })),
      vi.fn<typeof fetch>(async () => new Response(null, { status: 302, headers: { Location: "https://other.example" } })),
    ]) {
      const error = await requestConsoleSession(fetchFn, origin, cookies, 5000, operation).catch((failure: unknown) => failure);
      expect(error).toMatchObject({ code: "outcome_unknown" });
      expect(String(error)).not.toContain("sensitive");
      expect(fetchFn).toHaveBeenCalledTimes(1);
    }
    const failedRead = vi.fn<typeof fetch>(async () => { throw new Error("sensitive transport detail"); });
    await expect(requestConsoleSession(failedRead, origin, cookies, 5000, { kind: "inspect" }))
      .rejects.toMatchObject({ code: "service_unavailable" });
  });

  it("does not follow a login redirect to another origin", async () => {
    const redirected = vi.fn(() => HttpResponse.json({}));
    server.use(
      http.post(`${origin}/api/session/local`, () =>
        new HttpResponse(null, { status: 302, headers: { Location: "https://other.example/collect" } })),
      http.post("https://other.example/collect", redirected),
    );
    await expect(requestConsoleSession(fetch, origin, cookies, 5000, { kind: "login", username: "admin", password: "password" }))
      .rejects.toMatchObject({ code: "outcome_unknown" });
    expect(redirected).not.toHaveBeenCalled();
  });

  it("honors cancellation before dispatch and distinguishes an interrupted read from an uncertain write", async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchFn = vi.fn<typeof fetch>(async () => Response.json({}));
    await expect(requestConsoleSession(fetchFn, origin, cookies, 5000, { kind: "inspect" }, controller.signal))
      .rejects.toMatchObject({ code: "request_aborted" });
    expect(fetchFn).not.toHaveBeenCalled();

    for (const operation of [{ kind: "inspect" }, { kind: "logout" }] as const) {
      const active = new AbortController();
      const waitForAbort = vi.fn<typeof fetch>((_url, init) => new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
      }));
      const result = requestConsoleSession(waitForAbort, origin, cookies, 5000, operation, active.signal);
      active.abort();
      await expect(result).rejects.toMatchObject({ code: operation.kind === "inspect" ? "request_aborted" : "outcome_unknown" });
      expect(waitForAbort).toHaveBeenCalledTimes(1);
    }
  });

  it("aborts a stalled request at the configured timeout", async () => {
    const fetchFn = vi.fn<typeof fetch>((_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new Error("timed out")));
    }));
    await expect(requestConsoleSession(fetchFn, origin, cookies, 25, { kind: "inspect" }))
      .rejects.toMatchObject({ code: "service_unavailable" });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });
});
