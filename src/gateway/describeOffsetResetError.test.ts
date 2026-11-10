import { describe, expect, it } from "vitest";
import { ProductionChangeCanceled } from "../console/ProductionChangeCanceled";
import { describeOffsetResetError } from "./describeOffsetResetError";
import { HttpError } from "./HttpError";

describe("describeOffsetResetError", () => {
  it("explains each failure", () => {
    expect(describeOffsetResetError(new HttpError(409, "conflict", { code: "group_active" }))).toMatch(/^Stop the group's consumers first/);
    expect(describeOffsetResetError(new HttpError(409, "conflict", { code: "stale_preview" }))).toBe("The offsets changed since the preview. Preview again.");
    expect(describeOffsetResetError(new HttpError(404, "missing", { code: "not_found", detail: "Topic \"x\" was not found" }))).toBe("Topic \"x\" was not found");
    expect(describeOffsetResetError(new HttpError(404, "missing"))).toBe("The consumer group or topic was not found.");
    expect(describeOffsetResetError(new HttpError(400, "bad"))).toBe("Choose a topic and a valid target.");
    expect(describeOffsetResetError(new HttpError(403, "denied", { code: "forbidden", detail: "Not permitted: production_admin_required" })))
      .toBe("This is a Production cluster: only an ADMIN for it may change it.");
    expect(describeOffsetResetError(new HttpError(403, "denied"))).toBe("Your role does not allow this action on this cluster.");
    expect(describeOffsetResetError(new ProductionChangeCanceled())).toBe("Canceled; nothing was sent.");
    for (const code of ["offset_reset_unknown", "gateway_outcome_unknown", "outcome_unknown"]) {
      expect(describeOffsetResetError(new HttpError(503, "unknown", { code }))).toBe("The reset may have been applied; check the group's offsets before retrying.");
    }
    expect(describeOffsetResetError(new HttpError(503, "down", { code: "cluster_unreachable" }))).toBe("Kafka could not be reached. Try again.");
    expect(describeOffsetResetError(new TypeError("fetch failed"))).toBe("Kafka could not be reached. Try again.");
  });
});
