import { describe, expect, it } from "vitest";
import { describeDeleteTopicError } from "./describeDeleteTopicError";
import { HttpError } from "./HttpError";

describe("describeDeleteTopicError", () => {
  it("distinguishes missing topics, rejected requests and uncertain outcomes", () => {
    expect(describeDeleteTopicError(new HttpError(404, "missing"))).toContain("not found");
    expect(describeDeleteTopicError(new HttpError(401, "unauthorized"))).toContain("Authentication required");
    expect(describeDeleteTopicError(new HttpError(400, "invalid"))).toContain("rejected");
    expect(describeDeleteTopicError(new TypeError("network"))).toContain("may already be deleting");
    expect(describeDeleteTopicError(new HttpError(503, "failed"))).toContain("may already be deleting");
  });
});
