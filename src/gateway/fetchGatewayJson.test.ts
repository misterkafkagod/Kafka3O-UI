import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { server } from "../test/server";
import { fetchGatewayJson } from "./fetchGatewayJson";

describe("fetchGatewayJson", () => {
  it("sends a token only to its HTTPS gateway without following redirects", async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => Response.json({ ok: true }));
    const readToken = vi.fn(() => "a".repeat(32));
    await expect(fetchGatewayJson(fetchFn, "https://gateway.example/base", "https://gateway.example/base/api/v1/topics?query=x", 1000, readToken, true))
      .resolves.toEqual({ ok: true });

    expect(readToken).toHaveBeenCalledWith("https://gateway.example/base");
    const init = fetchFn.mock.calls[0][1]!;
    expect(new Headers(init.headers).get("Authorization")).toBe(`Bearer ${"a".repeat(32)}`);
    expect(init.redirect).toBe("error");
    expect(init.cache).toBe("no-store");
    expect(init.credentials).toBe("omit");
    expect(init.referrerPolicy).toBe("no-referrer");
  });

  it("blocks insecure, cross-gateway, wrong-path and insecure-context requests before reading the token", async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => Response.json({}));
    const readToken = vi.fn(() => "a".repeat(32));
    for (const [gateway, request, secure] of [
      ["http://gateway.example", "http://gateway.example/api/v1/topics", true],
      ["https://gateway.example/base", "https://other.example/base/api/v1/topics", true],
      ["https://gateway.example/base", "https://gateway.example/base-evil/api/v1/topics", true],
      ["https://gateway.example", "https://gateway.example/api/v1/topics", false],
    ] as const) {
      await expect(fetchGatewayJson(fetchFn, gateway, request, 1000, readToken, secure)).rejects.toThrow();
    }
    expect(fetchFn).not.toHaveBeenCalled();
    expect(readToken).not.toHaveBeenCalled();
  });

  it("sends no authorization header without a token and surfaces invalid stored credentials", async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => Response.json({}));
    await fetchGatewayJson(fetchFn, "https://gateway.example", "https://gateway.example/api/v1/topics", 1000, () => null, true);
    expect(new Headers(fetchFn.mock.calls[0][1]!.headers).has("Authorization")).toBe(false);
    await expect(fetchGatewayJson(fetchFn, "https://gateway.example", "https://gateway.example/api/v1/topics", 1000, () => "bad", true)).rejects.toThrow(/invalid format/);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("does not follow a gateway redirect to another origin", async () => {
    const redirected = vi.fn(() => HttpResponse.json({}));
    server.use(
      http.get("https://gateway.example/api/v1/topics", () =>
        new HttpResponse(null, { status: 302, headers: { Location: "https://other.example/collect" } })),
      http.get("https://other.example/collect", redirected),
    );
    await expect(fetchGatewayJson(fetch, "https://gateway.example", "https://gateway.example/api/v1/topics", 1000, () => "a".repeat(32), true))
      .rejects.toThrow();
    expect(redirected).not.toHaveBeenCalled();
  });

  it("sends authenticated writes with the same HTTPS and redirect restrictions", async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => Response.json({ partition: 0, offset: "0" }));
    await fetchGatewayJson(fetchFn, "https://gateway.example", "https://gateway.example/api/v1/topics/orders/messages",
      1000, () => "a".repeat(32), true, { method: "POST", body: '{"value":""}' });
    const init = fetchFn.mock.calls[0][1]!;
    expect(init.method).toBe("POST");
    expect(init.body).toBe('{"value":""}');
    expect(new Headers(init.headers).get("Content-Type")).toBe("application/json");
    expect(new Headers(init.headers).get("Authorization")).toBe(`Bearer ${"a".repeat(32)}`);
    expect(init.redirect).toBe("error");
    await expect(fetchGatewayJson(fetchFn, "https://gateway.example", "https://other.example/messages",
      1000, () => "a".repeat(32), true, { method: "POST", body: "{}" })).rejects.toThrow(/outside/);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("uses the explicitly enabled local test proxy without reading or sending a browser token", async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => Response.json({ ok: true }));
    const readToken = vi.fn(() => "a".repeat(32));
    const gateway = "http://localhost:5173/manual/gateways/a";
    await expect(fetchGatewayJson(fetchFn, gateway, `${gateway}/api/v1/topics?query=x`,
      1000, readToken, true, undefined, "http://localhost:5173")).resolves.toEqual({ ok: true });

    const init = fetchFn.mock.calls[0][1]!;
    expect(readToken).not.toHaveBeenCalled();
    expect(new Headers(init.headers).get("X-Kafka3O-Manual")).toBe("1");
    expect(new Headers(init.headers).has("Authorization")).toBe(false);
    expect(init.redirect).toBe("error");
    expect(init.credentials).toBe("omit");
  });

  it("preserves write and request-boundary checks for the local test proxy", async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => Response.json({ ok: true }));
    const readToken = vi.fn(() => null);
    const gateway = "http://localhost:5173/manual/gateways/b";
    await fetchGatewayJson(fetchFn, gateway, `${gateway}/api/v1/topics`, 1000, readToken, true,
      { method: "POST", body: '{"name":"example"}' }, "http://localhost:5173");
    const init = fetchFn.mock.calls[0][1]!;
    expect(init.method).toBe("POST");
    expect(init.body).toBe('{"name":"example"}');
    expect(new Headers(init.headers).get("Content-Type")).toBe("application/json");
    expect(new Headers(init.headers).get("X-Kafka3O-Manual")).toBe("1");
    expect(new Headers(init.headers).has("Authorization")).toBe(false);

    for (const [url, secure, origin] of [
      ["http://localhost:5173/manual/gateways/a/api/v1/topics", true, "http://localhost:5173"],
      ["http://attacker.example/manual/gateways/b/api/v1/topics", true, "http://localhost:5173"],
      [`${gateway}/api/v1/topics`, false, "http://localhost:5173"],
      [`${gateway}/api/v1/topics`, true, undefined],
      [`${gateway}/api/v1/topics`, true, "http://127.0.0.1:5173"],
    ] as const) {
      await expect(fetchGatewayJson(fetchFn, gateway, url, 1000, readToken, secure, undefined, origin)).rejects.toThrow();
    }
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(readToken).not.toHaveBeenCalled();
  });
});
