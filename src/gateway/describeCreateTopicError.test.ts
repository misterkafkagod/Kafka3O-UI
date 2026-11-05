import { describe, expect, it } from "vitest";
import { describeCreateTopicError } from "./describeCreateTopicError";
import { HttpError } from "./HttpError";

describe("describeCreateTopicError", () => {
  it("distinguishes conflicts, rejected requests and uncertain outcomes", () => {
    expect(describeCreateTopicError(new HttpError(409, "conflict"))).toContain("already exists");
    expect(describeCreateTopicError(new HttpError(401, "unauthorized"))).toContain("Authentication required");
    expect(describeCreateTopicError(new HttpError(422, "invalid"))).toContain("rejected");
    expect(describeCreateTopicError(new TypeError("network"))).toContain("may already exist");
    expect(describeCreateTopicError(new HttpError(503, "failed"))).toContain("may already exist");
  });
});
