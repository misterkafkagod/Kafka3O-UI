import { describe, expect, it, vi } from "vitest";
import type { AuditEvent } from "./ConsoleAudit";
import { ConsoleAdminError } from "./ConsoleAdminError";
import { buildAuditQuery } from "./buildAuditQuery";
import { groupAuditTimeline } from "./groupAuditTimeline";
import { parseAuditPage } from "./parseAuditPage";
import { requestConsoleAdmin } from "./requestConsoleAdmin";

const event = (sequence: number, operationId: string, outcome = "attempted"): AuditEvent => ({
  sequence, occurredAt: "2026-11-08T10:00:00Z", operationId, actorId: "alice", source: "local", clusterId: "prod", environment: "PRODUCTION",
  action: "messages.produce", resourceKind: "gateway_request", resourceId: "/api/v1/topics/orders/messages", decision: "allowed", outcome,
  reason: "Incident 42", beforeState: "", afterState: "",
});

describe("audit client helpers", () => {
  it("builds strict queries from non-empty filters", () => {
    expect(buildAuditQuery({ cluster: " prod ", actor: "", action: "messages.produce", outcome: "", from: "", until: "" }, "41", 100))
      .toBe("cluster=prod&action=messages.produce&after=41&limit=100");
    expect(buildAuditQuery({ cluster: "", actor: "", action: "", outcome: "", from: "", until: "" })).toBe("");
    expect(buildAuditQuery({ cluster: "", actor: "", action: "", outcome: "", from: "2026-11-08T10:00:00Z", until: "" })).toBe("from=2026-11-08T10%3A00%3A00Z");
  });

  it("parses pages strictly", () => {
    const page = { operationId: "op", events: [event(1, "a")], nextCursor: "" };
    expect(parseAuditPage(page)).toEqual(page);
    for (const bad of [null, { ...page, events: [{ ...event(1, "a"), sequence: "1" }] }, { ...page, events: [{ ...event(1, "a"), reason: 5 }] }]) {
      expect(() => parseAuditPage(bad)).toThrow(ConsoleAdminError);
    }
  });

  it("groups intent and outcome by operation ID in order", () => {
    const groups = groupAuditTimeline([event(1, "a"), event(2, "b"), event(3, "a", "confirmed"), event(4, "")]);
    expect(groups.map((group) => [group.operationId, group.events.map((e) => e.sequence)])).toEqual([["a", [1, 3]], ["b", [2]], ["event-4", [4]]]);
  });

  it("reads audit same-origin and distinguishes a scope denial", async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => Response.json({ status: 403, code: "audit_access_denied" }, { status: 403 }));
    await expect(requestConsoleAdmin(fetchFn, "https://c.example", () => "", 5000, { kind: "listAudit", query: "cluster=prod" }))
      .rejects.toMatchObject({ code: "audit_access_denied" });
    expect(fetchFn.mock.calls[0][0]).toBe("https://c.example/api/audit?cluster=prod");
    expect(fetchFn.mock.calls[0][1]?.method).toBe("GET");
  });
});
