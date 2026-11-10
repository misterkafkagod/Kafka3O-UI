import { describe, expect, it } from "vitest";
import { describeOffsetResetError } from "./describeOffsetResetError";
import { HttpError } from "./HttpError";

describe("describeOffsetResetError", () => {
  it("explains each failure", () => {
    expect(describeOffsetResetError(new HttpError(409, "conflict", { code: "group_active" }))).toMatch(/^Stop the group's consumers first/);
    expect(describeOffsetResetError(new HttpError(404, "missing", { code: "not_found", detail: "Topic \"x\" was not found" }))).toBe("Topic \"x\" was not found");
    expect(describeOffsetResetError(new HttpError(404, "missing"))).toBe("The consumer group or topic was not found.");
    expect(describeOffsetResetError(new HttpError(400, "bad"))).toBe("Choose a topic and a valid target.");
    expect(describeOffsetResetError(new HttpError(403, "denied"))).toBe("You are not permitted to do this on this cluster.");
    expect(describeOffsetResetError(new HttpError(503, "down"))).toBe("Kafka could not be reached. Try again.");
    expect(describeOffsetResetError(new TypeError("fetch failed"))).toBe("Kafka could not be reached. Try again.");
  });
});
