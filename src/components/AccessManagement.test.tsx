import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AccessListing, ClusterListing, ConsoleAdminClient } from "../console/ConsoleAdmin";
import { ConsoleAdminError } from "../console/ConsoleAdminError";
import { AccessManagement } from "./AccessManagement";

const listing: AccessListing = {
  operationId: "list", policyRevision: 2, nextCursor: "", groupGrantsTruncated: false,
  identities: [
    { id: "admin-id", source: "local", label: "admin", enabled: true, grants: [{ clusterId: "", role: "ADMIN" }] },
    { id: "alice-id", source: "local", label: "alice", enabled: true, grants: [{ clusterId: "", role: "VIEWER" }, { clusterId: "prod", role: "ADMIN" }] },
    { id: "sub-1", source: "cognito", label: "opaque-subject", enabled: false, grants: [] },
  ],
  groupGrants: [{ issuer: "https://issuer.example", group: "Kafka Ops", clusterId: "dev", role: "OPERATOR" }],
};
const clusters: ClusterListing = {
  operationId: "clusters", policyRevision: 2,
  clusters: [
    { id: "dev", name: "Dev", gatewayUrl: "https://dev.example", environment: "NON_PRODUCTION", active: true },
    { id: "prod", name: "Prod", gatewayUrl: "https://prod.example", environment: "PRODUCTION", active: true },
  ],
};

function testAdmin() {
  return {
    listAccess: vi.fn<ConsoleAdminClient["listAccess"]>().mockResolvedValue(listing),
    listClusters: vi.fn<ConsoleAdminClient["listClusters"]>().mockResolvedValue(clusters),
    changeRoleGrant: vi.fn<ConsoleAdminClient["changeRoleGrant"]>().mockResolvedValue({ operationId: "op-1", policyRevision: 3 }),
    changeGroupMapping: vi.fn<ConsoleAdminClient["changeGroupMapping"]>().mockResolvedValue({ operationId: "op-2", policyRevision: 3 }),
    classifyCluster: vi.fn<ConsoleAdminClient["classifyCluster"]>(),
  };
}

describe("AccessManagement", () => {
  it("shows grants by source and scope and explains the additive model", async () => {
    render(<AccessManagement admin={testAdmin()} confirm={() => false} onUnauthorized={() => {}} />);
    const identities = await screen.findByRole("region", { name: "Identities and direct grants" });
    const alice = within(identities).getByRole("row", { name: /alice/ });
    expect(alice.textContent).toContain("VIEWER — All clusters (direct)");
    expect(alice.textContent).toContain("ADMIN — Cluster Prod (prod) (direct)");
    expect(within(identities).getByRole("row", { name: /opaque-subject/ }).textContent).toContain("Cognito identityDisabledNo access");
    const groups = screen.getByRole("region", { name: "Cognito group mappings" });
    expect(groups.textContent).toContain("Cluster Dev (dev) (Cognito group)");
    expect(screen.getByText(/Access is additive/).textContent).toContain("does not limit an existing global OPERATOR or ADMIN grant");
  });

  it("confirms the subject, scope and before/after role and sends nothing on cancel", async () => {
    const user = userEvent.setup();
    const admin = testAdmin();
    const confirm = vi.fn(() => false);
    render(<AccessManagement admin={admin} confirm={confirm} onUnauthorized={() => {}} />);
    await user.selectOptions(await screen.findByLabelText("Identity"), "alice-id");
    await user.selectOptions(screen.getAllByLabelText("Scope")[0], "prod");
    await user.selectOptions(screen.getAllByLabelText("Role")[0], "OPERATOR");
    expect(screen.getByText("Current direct role for this scope: ADMIN")).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Review grant change" }));
    expect(confirm).toHaveBeenCalledWith("Change the direct grant of alice (local account) for Cluster Prod (prod) from ADMIN to OPERATOR?");
    expect(admin.changeRoleGrant).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toBe("Canceled. No change was sent.");

    confirm.mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "Review grant change" }));
    expect(admin.changeRoleGrant).toHaveBeenCalledExactlyOnceWith("alice-id", "prod", "ADMIN", "OPERATOR");
    expect(await screen.findByText("Saved. Policy revision 3 (operation op-1).")).toBeDefined();
    expect(admin.listAccess).toHaveBeenCalledTimes(2);
  });

  it("maps a Cognito group with its current role as the expectation", async () => {
    const user = userEvent.setup();
    const admin = testAdmin();
    const confirm = vi.fn(() => true);
    render(<AccessManagement admin={admin} confirm={confirm} onUnauthorized={() => {}} />);
    await user.type(await screen.findByLabelText("Issuer"), "https://issuer.example");
    await user.type(screen.getByLabelText("Group (case-sensitive)"), "Kafka Ops");
    await user.selectOptions(screen.getAllByLabelText("Scope")[1], "dev");
    await user.selectOptions(screen.getAllByLabelText("Role")[1], "");
    await user.click(screen.getByRole("button", { name: "Review mapping change" }));
    expect(confirm).toHaveBeenCalledWith('Change Cognito group "Kafka Ops" from https://issuer.example for Cluster Dev (dev) from OPERATOR to No access?');
    expect(admin.changeGroupMapping).toHaveBeenCalledExactlyOnceWith("https://issuer.example", "Kafka Ops", "dev", "OPERATOR", "");
  });

  it("distinguishes conflicts, forbidden, audit and unknown outcomes and hands 401 back to sign-in", async () => {
    const user = userEvent.setup();
    for (const [code, text] of [
      ["policy_conflict", "Access changed since this page loaded"],
      ["self_access_change", "You cannot change your own access"],
      ["audit_unavailable", "nothing was changed"],
      ["outcome_unknown", "Do not retry it"],
    ] as const) {
      const admin = testAdmin();
      admin.changeRoleGrant.mockRejectedValue(new ConsoleAdminError(code, 503, "op-9"));
      const view = render(<AccessManagement admin={admin} confirm={() => true} onUnauthorized={() => {}} />);
      await user.selectOptions(await screen.findByLabelText("Identity"), "alice-id");
      await user.selectOptions(screen.getAllByLabelText("Role")[0], "OPERATOR");
      await user.click(screen.getByRole("button", { name: "Review grant change" }));
      expect((await screen.findByRole("alert")).textContent).toContain(text);
      expect(admin.changeRoleGrant).toHaveBeenCalledTimes(1);
      if (code === "policy_conflict") await waitFor(() => expect(admin.listAccess).toHaveBeenCalledTimes(2));
      view.unmount();
    }
    const admin = testAdmin();
    admin.listAccess.mockRejectedValue(new ConsoleAdminError("global_admin_required", 403));
    const forbidden = render(<AccessManagement admin={admin} confirm={() => true} onUnauthorized={() => {}} />);
    expect((await screen.findByRole("alert")).textContent).toContain("Only a local global administrator");
    forbidden.unmount();
    const onUnauthorized = vi.fn();
    const expired = testAdmin();
    expired.listAccess.mockRejectedValue(new ConsoleAdminError("unauthorized", 401));
    render(<AccessManagement admin={expired} confirm={() => true} onUnauthorized={onUnauthorized} />);
    await waitFor(() => expect(onUnauthorized).toHaveBeenCalledTimes(1));
  });

  it("refuses a no-op change without sending it", async () => {
    const user = userEvent.setup();
    const admin = testAdmin();
    const confirm = vi.fn(() => true);
    render(<AccessManagement admin={admin} confirm={confirm} onUnauthorized={() => {}} />);
    await user.selectOptions(await screen.findByLabelText("Identity"), "alice-id");
    await user.click(screen.getByRole("button", { name: "Review grant change" }));
    expect(screen.getByRole("alert").textContent).toContain("Choose a role different");
    expect(confirm).not.toHaveBeenCalled();
    expect(admin.changeRoleGrant).not.toHaveBeenCalled();
  });
});
