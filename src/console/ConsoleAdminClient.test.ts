import { describe, expect, it, vi } from "vitest";
import type { ConsoleAdminTransport } from "./ConsoleAdmin";
import { changeGroupMapping } from "./changeGroupMapping";
import { changeRoleGrant } from "./changeRoleGrant";
import { classifyCluster } from "./classifyCluster";
import { listAccess } from "./listAccess";
import { listClusters } from "./listClusters";

describe("Console administration client actions", () => {
  it("send one operation each and parse the response", async () => {
    const transport = vi.fn<ConsoleAdminTransport>(async (operation) => {
      if (operation.kind === "listAccess") return { operationId: "a", policyRevision: 0, identities: [], nextCursor: "", groupGrants: [], groupGrantsTruncated: false };
      if (operation.kind === "listClusters") return { operationId: "c", policyRevision: 0, clusters: [] };
      return { operationId: "w", policyRevision: 4 };
    });
    await expect(listAccess(transport, "cursor")).resolves.toMatchObject({ operationId: "a" });
    await expect(listClusters(transport)).resolves.toMatchObject({ operationId: "c" });
    await expect(changeRoleGrant(transport, "alice", "prod", "", "ADMIN")).resolves.toEqual({ operationId: "w", policyRevision: 4 });
    await expect(changeGroupMapping(transport, "https://i.example", "Ops", "", "VIEWER", "")).resolves.toEqual({ operationId: "w", policyRevision: 4 });
    await expect(classifyCluster(transport, "prod", "", "PRODUCTION", "Customer data")).resolves.toEqual({ operationId: "w", policyRevision: 4 });
    expect(transport.mock.calls.map(([operation]) => operation)).toEqual([
      { kind: "listAccess", after: "cursor" },
      { kind: "listClusters" },
      { kind: "changeRoleGrant", identityId: "alice", clusterId: "prod", expectedRole: "", role: "ADMIN" },
      { kind: "changeGroupMapping", issuer: "https://i.example", group: "Ops", clusterId: "", expectedRole: "VIEWER", role: "" },
      { kind: "classifyCluster", clusterId: "prod", expectedEnvironment: "", environment: "PRODUCTION", reason: "Customer data" },
    ]);
  });

  it("treats an unreadable write success as an unknown outcome", async () => {
    const transport: ConsoleAdminTransport = async () => ({ policyRevision: 1 });
    await expect(changeRoleGrant(transport, "alice", "", "", "VIEWER")).rejects.toMatchObject({ code: "outcome_unknown" });
  });
});
