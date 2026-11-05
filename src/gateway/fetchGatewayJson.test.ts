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
});
