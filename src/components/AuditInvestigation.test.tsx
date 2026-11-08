import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AuditEvent, ConsoleAuditClient } from "../console/ConsoleAudit";
import { ConsoleAdminError } from "../console/ConsoleAdminError";
import { AuditInvestigation } from "./AuditInvestigation";

const event = (sequence: number, operationId: string, outcome: string, resourceKind: string): AuditEvent => ({
  sequence, occurredAt: `2026-11-08T10:00:0${sequence}Z`, operationId, actorId: "alice", source: "local", clusterId: "prod", environment: "PRODUCTION",
  action: "messages.produce", resourceKind, resourceId: "/api/v1/topics/orders/messages", decision: "allowed", outcome, reason: "Incident 42",
  beforeState: "", afterState: "",
});

function testAudit() {
  return {
    list: vi.fn<ConsoleAuditClient["list"]>().mockResolvedValue({ operationId: "read", nextCursor: "2",
      events: [event(1, "op-1", "attempted", "gateway_request"), event(2, "op-1", "confirmed", "gateway_outcome")] }),
    exportUrl: vi.fn<ConsoleAuditClient["exportUrl"]>((filters) => `/api/audit/export?cluster=${filters.cluster}`),
    scopes: vi.fn<ConsoleAuditClient["scopes"]>().mockResolvedValue([{ id: "prod", name: "Prod" }]),
  };
}

describe("AuditInvestigation", () => {
  it("searches a scope, groups correlated events and offers a scoped export", async () => {
    const user = userEvent.setup();
    const audit = testAudit();
    render(<AuditInvestigation audit={audit} onUnauthorized={() => {}} />);
    await user.selectOptions(await screen.findByLabelText("Scope"), "prod");
    await user.type(screen.getByLabelText("Action"), "messages.produce");
    await user.click(screen.getByRole("button", { name: "Search audit" }));
    expect(audit.list).toHaveBeenCalledWith({ cluster: "prod", actor: "", action: "messages.produce", outcome: "", from: "", until: "" }, undefined);
    const operation = await screen.findByRole("rowgroup", { name: "Operation op-1" });
    expect(within(operation).getAllByRole("row")).toHaveLength(2);
    expect(operation.textContent).toContain("confirmed");
    expect(operation.textContent).toContain("reason: Incident 42");
    expect(screen.getByRole("link", { name: "Export CSV" }).getAttribute("href")).toBe("/api/audit/export?cluster=prod");
    await user.click(screen.getByRole("button", { name: "Load more" }));
    expect(audit.list).toHaveBeenLastCalledWith(expect.objectContaining({ cluster: "prod" }), "2");
  });

  it("explains a scope denial without data or export and hands 401 back to sign-in", async () => {
    const user = userEvent.setup();
    const audit = testAudit();
    audit.list.mockRejectedValueOnce(new ConsoleAdminError("audit_access_denied", 403));
    const view = render(<AuditInvestigation audit={audit} onUnauthorized={() => {}} />);
    await user.click(await screen.findByRole("button", { name: "Search audit" }));
    expect((await screen.findByRole("alert")).textContent).toContain("all-cluster audit requires global ADMIN");
    expect(screen.queryByRole("link", { name: "Export CSV" })).toBeNull();
    view.unmount();
    const onUnauthorized = vi.fn();
    const expired = testAudit();
    expired.list.mockRejectedValue(new ConsoleAdminError("unauthorized", 401));
    render(<AuditInvestigation audit={expired} onUnauthorized={onUnauthorized} />);
    await user.click(await screen.findByRole("button", { name: "Search audit" }));
    await waitFor(() => expect(onUnauthorized).toHaveBeenCalledTimes(1));
  });
});
