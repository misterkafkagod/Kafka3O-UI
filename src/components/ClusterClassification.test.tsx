import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ClusterListing, ConsoleAdminClient } from "../console/ConsoleAdmin";
import { ConsoleAdminError } from "../console/ConsoleAdminError";
import { ClusterClassification } from "./ClusterClassification";

const clusters: ClusterListing = {
  operationId: "clusters", policyRevision: 1,
  clusters: [
    { id: "dev", name: "Dev", gatewayUrl: "https://dev.example:8081", environment: "", active: true },
    { id: "prod", name: "Prod", gatewayUrl: "https://prod.example:8082", environment: "PRODUCTION", active: true },
    { id: "old", name: "Old", gatewayUrl: "https://old.example", environment: "NON_PRODUCTION", active: false },
  ],
};

function testAdmin() {
  return {
    listAccess: vi.fn<ConsoleAdminClient["listAccess"]>(),
    listClusters: vi.fn<ConsoleAdminClient["listClusters"]>().mockResolvedValue(clusters),
    changeRoleGrant: vi.fn<ConsoleAdminClient["changeRoleGrant"]>(),
    changeGroupMapping: vi.fn<ConsoleAdminClient["changeGroupMapping"]>(),
    classifyCluster: vi.fn<ConsoleAdminClient["classifyCluster"]>().mockResolvedValue({ operationId: "op-1", policyRevision: 2 }),
  };
}

describe("ClusterClassification", () => {
  it("shows the authoritative environment and active state of every registered cluster", async () => {
    render(<ClusterClassification admin={testAdmin()} confirm={() => false} onUnauthorized={() => {}} />);
    const table = await screen.findByRole("region", { name: "Registered clusters" });
    expect(within(table).getByRole("row", { name: /Dev \(dev\)/ }).textContent).toContain("Unclassified — writes blocked");
    expect(within(table).getByRole("row", { name: /Prod \(prod\)/ }).textContent).toContain("ProductionActive");
    expect(within(table).getByRole("row", { name: /Old \(old\)/ }).textContent).toContain("Inactive");
    expect(screen.queryByRole("option", { name: "Old (old)" })).toBeNull();
  });

  it("requires a reason and a confirmation naming the cluster and before/after environment", async () => {
    const user = userEvent.setup();
    const admin = testAdmin();
    const confirm = vi.fn(() => false);
    render(<ClusterClassification admin={admin} confirm={confirm} onUnauthorized={() => {}} />);
    await user.selectOptions(await screen.findByLabelText("Cluster"), "dev");
    await user.click(screen.getByRole("button", { name: "Review classification" }));
    expect(screen.getByRole("alert").textContent).toContain("Enter a reason");
    expect(confirm).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText("Reason"), "  Customer-facing data  ");
    await user.click(screen.getByRole("button", { name: "Review classification" }));
    expect(confirm).toHaveBeenCalledWith("Classify Dev (dev) from Unclassified — writes blocked to Production? Reason: Customer-facing data");
    expect(admin.classifyCluster).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toBe("Canceled. No change was sent.");
    confirm.mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "Review classification" }));
    expect(admin.classifyCluster).toHaveBeenCalledExactlyOnceWith("dev", "", "PRODUCTION", "Customer-facing data");
    expect(await screen.findByText("Saved. Policy revision 2 (operation op-1).")).toBeDefined();
  });

  it("shows conflicts and unknown outcomes distinctly and hands 401 back to sign-in", async () => {
    const user = userEvent.setup();
    const admin = testAdmin();
    admin.classifyCluster.mockRejectedValueOnce(new ConsoleAdminError("policy_conflict", 409)).mockRejectedValueOnce(new ConsoleAdminError("outcome_unknown", 503, "op-x"));
    render(<ClusterClassification admin={admin} confirm={() => true} onUnauthorized={() => {}} />);
    await user.selectOptions(await screen.findByLabelText("Cluster"), "prod");
    await user.selectOptions(screen.getByLabelText("Environment"), "NON_PRODUCTION");
    await user.type(screen.getByLabelText("Reason"), "Decommissioned");
    await user.click(screen.getByRole("button", { name: "Review classification" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Access changed since this page loaded");
    await waitFor(() => expect(admin.listClusters).toHaveBeenCalledTimes(2));
    await user.click(screen.getByRole("button", { name: "Review classification" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Do not retry it");
    expect(admin.classifyCluster).toHaveBeenCalledTimes(2);
    const onUnauthorized = vi.fn();
    const expired = testAdmin();
    expired.listClusters.mockRejectedValue(new ConsoleAdminError("unauthorized", 401));
    render(<ClusterClassification admin={expired} confirm={() => true} onUnauthorized={onUnauthorized} />);
    await waitFor(() => expect(onUnauthorized).toHaveBeenCalledTimes(1));
  });
});
