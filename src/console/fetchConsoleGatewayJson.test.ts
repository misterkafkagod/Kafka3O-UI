import { describe, expect, it, vi } from "vitest";
import { HttpError } from "../gateway/HttpError";
import { classifyGatewayError } from "../gateway/classifyGatewayError";
import { fetchConsoleGatewayJson } from "./fetchConsoleGatewayJson";

const origin = "https://console.example";
const gateway = `${origin}/api/clusters/dev/gateway`;
const token = "A".repeat(43);
const cookies = () => `__Host-kafka3o_csrf=${token}`;

describe("fetchConsoleGatewayJson", () => {
  it("sends reads and writes same-origin with the session cookie, CSRF only on writes and no tokens", async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => Response.json({ ok: true }));
    await fetchConsoleGatewayJson(fetchFn, origin, cookies, gateway, `${gateway}/api/v1/topics`, 8000, () => {});
    await fetchConsoleGatewayJson(fetchFn, origin, cookies, gateway, `${gateway}/api/v1/topics/orders/messages`, 8000, () => {},
      { method: "POST", body: '{"value":"v"}' });
    const [readUrl, read] = fetchFn.mock.calls[0];
    const [, write] = fetchFn.mock.calls[1];
    expect(readUrl).toBe(`${gateway}/api/v1/topics`);
    for (const init of [read, write]) {
      expect(init?.credentials).toBe("same-origin");
      expect(init?.mode).toBe("same-origin");
      expect(init?.redirect).toBe("error");
      expect(new Headers(init?.headers).has("Authorization")).toBe(false);
    }
    expect(new Headers(read?.headers).get("X-Kafka3O-CSRF")).toBeNull();
    expect(new Headers(write?.headers).get("X-Kafka3O-CSRF")).toBe(token);
    expect(write?.body).toBe('{"value":"v"}');
  });

  it("refuses URLs outside the Console forwarding base before sending", async () => {
    const fetchFn = vi.fn<typeof fetch>();
    for (const [base, url] of [
      [gateway, "https://gateway.example/api/v1/topics"],
      [gateway, `${origin}/api/clusters/prod/gateway/api/v1/topics`],
      ["https://localhost:8081", "https://localhost:8081/api/v1/topics"],
      [gateway, `${gateway}/openapi.json`],
    ]) {
      await expect(fetchConsoleGatewayJson(fetchFn, origin, cookies, base, url, 8000, () => {})).rejects.toThrow("outside");
    }
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("ends the session on 401 and classifies denials, policy outages and unknown outcomes", async () => {
    const onUnauthorized = vi.fn();
    const problem = (status: number, code: string, title = "t") => async () => Response.json({ status, code, title }, { status });
    const fail = async (fetchFn: typeof fetch) => {
      try {
        await fetchConsoleGatewayJson(fetchFn, origin, cookies, gateway, `${gateway}/api/v1/topics`, 8000, onUnauthorized);
      } catch (error) {
        return error;
      }
      throw new Error("expected a failure");
    };
    expect(classifyGatewayError(await fail(problem(401, "unauthorized")))).toBe("authentication-required");
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    const denied = await fail(problem(403, "forbidden", "Not permitted: production_admin_required"));
    expect(classifyGatewayError(denied)).toBe("access-denied");
    expect((denied as HttpError).problem?.detail).toBe("Not permitted: production_admin_required");
    expect(classifyGatewayError(await fail(problem(503, "authorization_unavailable")))).toBe("authorization-unavailable");
    expect(classifyGatewayError(await fail(problem(503, "gateway_outcome_unknown")))).toBe("outcome-unknown");
    expect(classifyGatewayError(await fail(problem(503, "gateway_unavailable")))).toBe("gateway-unreachable");
    expect(classifyGatewayError(await fail(problem(503, "cluster_unreachable")))).toBe("cluster-unreachable");
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });
});
