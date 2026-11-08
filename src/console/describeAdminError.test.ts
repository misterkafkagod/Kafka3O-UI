import { describe, expect, it } from "vitest";
import { ConsoleAdminError, type ConsoleAdminErrorCode } from "./ConsoleAdminError";
import { describeAdminError } from "./describeAdminError";

describe("describeAdminError", () => {
  it("gives each failure class a distinct explanation", () => {
    const codes: ConsoleAdminErrorCode[] = ["unauthorized", "global_admin_required", "password_change_required", "self_access_change",
      "policy_conflict", "last_global_admin", "not_found", "change_reason_required", "invalid_request", "audit_unavailable",
      "outcome_unknown", "service_unavailable"];
    const messages = codes.map((code) => describeAdminError(new ConsoleAdminError(code)));
    expect(new Set(messages).size).toBe(codes.length);
  });

  it("tells the user not to retry an unknown outcome and keeps the operation ID", () => {
    const message = describeAdminError(new ConsoleAdminError("outcome_unknown", 503, "op-7"));
    expect(message).toContain("Do not retry");
    expect(message).toContain("op-7");
    expect(describeAdminError(new Error("raw internal detail"))).not.toContain("raw internal detail");
  });
});
