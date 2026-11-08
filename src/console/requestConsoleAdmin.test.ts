import { describe, expect, it, vi } from "vitest";
import type { ConsoleAdminOperation } from "./ConsoleAdmin";
import { ConsoleAdminError } from "./ConsoleAdminError";
import { requestConsoleAdmin } from "./requestConsoleAdmin";

const origin = "https://console.example";
const token = "A".repeat(43);
const cookies = () => `other=value; __Host-kafka3o_csrf=${token}`;
const grant: ConsoleAdminOperation = { kind: "changeRoleGrant", identityId: "alice", clusterId: "prod", expectedRole: "", role: "ADMIN" };

function problem(status: number, code: string, operationId = "operation-1") {
  return Response.json({ title: "Problem", status, code, operationId }, { status });
}

async function failure(fetchFn: typeof fetch, operation: ConsoleAdminOperation = grant): Promise<ConsoleAdminError> {
  try {
    await requestConsoleAdmin(fetchFn, origin, cookies, 5000, operation);
  } catch (error) {
    if (error instanceof ConsoleAdminError) return error;
    throw error;
  }
  throw new Error("request unexpectedly succeeded");
}

describe("requestConsoleAdmin", () => {
  it("uses fixed same-origin paths, cookie credentials, CSRF only on writes and no redirects or caching", async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => Response.json({ ok: true }));
    const cases: { operation: ConsoleAdminOperation; path: string; method: string; body?: object }[] = [
      { operation: { kind: "listAccess" }, path: "/api/admin/access?limit=100", method: "GET" },
      { operation: { kind: "listAccess", after: "id/with space" }, path: "/api/admin/access?limit=100&after=id%2Fwith%20space", method: "GET" },
      { operation: { kind: "listClusters" }, path: "/api/admin/clusters", method: "GET" },
      { operation: grant, path: "/api/admin/role-grants", method: "PUT", body: { identityId: "alice", clusterId: "prod", expectedRole: "", role: "ADMIN" } },
      { operation: { kind: "changeGroupMapping", issuer: "https://issuer.example", group: "Ops", clusterId: "", expectedRole: "VIEWER", role: "" },
        path: "/api/admin/group-mappings", method: "PUT", body: { issuer: "https://issuer.example", group: "Ops", clusterId: "", expectedRole: "VIEWER", role: "" } },
      { operation: { kind: "classifyCluster", clusterId: "prod", expectedEnvironment: "", environment: "PRODUCTION", reason: "Customer data" },
        path: "/api/admin/clusters/prod/environment", method: "PUT", body: { expectedEnvironment: "", environment: "PRODUCTION", reason: "Customer data" } },
    ];
    for (const [index, item] of cases.entries()) {
      await expect(requestConsoleAdmin(fetchFn, origin, cookies, 5000, item.operation)).resolves.toEqual({ ok: true });
      const [url, init] = fetchFn.mock.calls[index];
      expect(url).toBe(origin + item.path);
      expect(init?.method).toBe(item.method);
      expect(init?.credentials).toBe("same-origin");
      expect(init?.mode).toBe("same-origin");
      expect(init?.redirect).toBe("error");
      expect(init?.cache).toBe("no-store");
      expect(init?.referrerPolicy).toBe("no-referrer");
      const headers = new Headers(init?.headers);
      expect(headers.get("X-Kafka3O-CSRF")).toBe(item.body ? token : null);
      expect(headers.has("Authorization")).toBe(false);
      expect(init?.body).toBe(item.body ? JSON.stringify(item.body) : undefined);
    }
  });

  it("refuses insecure origins and writes without a CSRF cookie before sending", async () => {
    const fetchFn = vi.fn<typeof fetch>();
    for (const bad of ["http://console.example", "https://console.example/path", "not a url"]) {
      await expect(requestConsoleAdmin(fetchFn, bad, cookies, 5000, { kind: "listClusters" })).rejects.toMatchObject({ code: "insecure_origin" });
    }
    await expect(requestConsoleAdmin(fetchFn, origin, () => "", 5000, grant)).rejects.toMatchObject({ code: "csrf_unavailable" });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("distinguishes authentication, authorization, conflict, validation, audit and unknown outcomes", async () => {
    const cases: [Response, string][] = [
      [problem(401, "unauthorized"), "unauthorized"],
      [problem(403, "global_admin_required"), "global_admin_required"],
      [problem(403, "password_change_required"), "password_change_required"],
      [problem(403, "self_access_change"), "self_access_change"],
      [problem(403, "csrf_rejected"), "global_admin_required"],
      [problem(409, "policy_conflict"), "policy_conflict"],
      [problem(409, "last_global_admin"), "last_global_admin"],
      [problem(404, "cluster_not_found"), "not_found"],
      [problem(400, "change_reason_required"), "change_reason_required"],
      [problem(400, "invalid_access_change"), "invalid_request"],
      [problem(503, "access_change_audit_unavailable"), "audit_unavailable"],
      [problem(503, "access_change_outcome_unknown"), "outcome_unknown"],
      [new Response("not json", { status: 502 }), "outcome_unknown"],
    ];
    for (const [response, code] of cases) {
      const error = await failure(async () => response.clone());
      expect(error.code).toBe(code);
      if (response.status !== 502) expect(error.operationId).toBe("operation-1");
    }
  });

  it("never reports a lost write response as a definite failure", async () => {
    expect((await failure(async () => { throw new TypeError("network"); })).code).toBe("outcome_unknown");
    expect((await failure(async () => { throw new TypeError("network"); }, { kind: "listAccess" })).code).toBe("service_unavailable");
    expect((await failure(async () => problem(503, "access_list_audit_unavailable"), { kind: "listAccess" })).code).toBe("audit_unavailable");
    expect((await failure(async () => problem(503, "access_list_unavailable"), { kind: "listAccess" })).code).toBe("service_unavailable");
  });
});
