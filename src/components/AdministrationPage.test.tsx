import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ConsoleAdminClient } from "../console/ConsoleAdmin";
import type { ConsoleAuditClient } from "../console/ConsoleAudit";
import { AdministrationPage } from "./AdministrationPage";

function clients() {
  const admin = {
    listAccess: vi.fn<ConsoleAdminClient["listAccess"]>().mockResolvedValue({
      operationId: "a", policyRevision: 0, identities: [], nextCursor: "", groupGrants: [], groupGrantsTruncated: false,
    }),
    listClusters: vi.fn<ConsoleAdminClient["listClusters"]>().mockResolvedValue({ operationId: "c", policyRevision: 0, clusters: [] }),
    changeRoleGrant: vi.fn<ConsoleAdminClient["changeRoleGrant"]>(),
    changeGroupMapping: vi.fn<ConsoleAdminClient["changeGroupMapping"]>(),
    classifyCluster: vi.fn<ConsoleAdminClient["classifyCluster"]>(),
  };
  const audit: ConsoleAuditClient = {
    list: vi.fn<ConsoleAuditClient["list"]>(),
    exportUrl: () => "/api/audit/export",
    scopes: vi.fn<ConsoleAuditClient["scopes"]>().mockResolvedValue([]),
  };
  return { admin, audit };
}

describe("AdministrationPage", () => {
  it("shows every section to a global ADMIN", async () => {
    const { admin, audit } = clients();
    render(<AdministrationPage administration={{ access: true, audit: true }} admin={admin} audit={audit} confirm={() => true} onUnauthorized={() => undefined} />);

    expect(screen.getByRole("heading", { name: "Administration" })).toBeDefined();
    expect(await screen.findByRole("heading", { name: "Access management" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Cluster classification" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Audit" })).toBeDefined();
  });

  it("shows only Audit to a cluster ADMIN and requests no access data", () => {
    const { admin, audit } = clients();
    render(<AdministrationPage administration={{ access: false, audit: true }} admin={admin} audit={audit} confirm={() => true} onUnauthorized={() => undefined} />);

    expect(screen.getByRole("heading", { name: "Audit" })).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Access management" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Cluster classification" })).toBeNull();
    expect(admin.listAccess).not.toHaveBeenCalled();
    expect(admin.listClusters).not.toHaveBeenCalled();
  });

  it("says Not permitted without requesting anything when the session has no ADMIN role", () => {
    const { admin, audit } = clients();
    render(<AdministrationPage administration={{ access: false, audit: false }} admin={admin} audit={audit} confirm={() => true} onUnauthorized={() => undefined} />);

    expect(screen.getByRole("heading", { name: "Not permitted" })).toBeDefined();
    expect(admin.listAccess).not.toHaveBeenCalled();
    expect(admin.listClusters).not.toHaveBeenCalled();
  });

  it("waits for the session check before deciding", () => {
    const { admin, audit } = clients();
    render(<AdministrationPage administration={undefined} admin={admin} audit={audit} confirm={() => true} onUnauthorized={() => undefined} />);

    expect(screen.getByRole("status").textContent).toBe("Checking access...");
    expect(screen.queryByRole("heading", { name: "Not permitted" })).toBeNull();
    expect(admin.listAccess).not.toHaveBeenCalled();
  });
});
