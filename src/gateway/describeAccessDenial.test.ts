import { describe, expect, it } from "vitest";
import { describeAccessDenial } from "./describeAccessDenial";

describe("describeAccessDenial", () => {
  it("explains each policy denial without exposing raw codes", () => {
    expect(describeAccessDenial("Not permitted: production_admin_required")).toContain("Production");
    expect(describeAccessDenial("Not permitted: change_reason_required")).toContain("change reason");
    expect(describeAccessDenial("Not permitted: environment_unclassified")).toContain("not classified");
    expect(describeAccessDenial("Not permitted: insufficient_role")).toBe("Your role does not allow this action on this cluster.");
    expect(describeAccessDenial(undefined)).toBe("Your role does not allow this action on this cluster.");
  });
});
