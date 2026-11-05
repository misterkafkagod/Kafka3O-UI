import { describe, expect, it } from "vitest";
import { describeProduceError } from "./describeProduceError";
import { HttpError } from "./HttpError";

describe("describeProduceError", () => {
  it("distinguishes rejection, authentication, and unconfirmed delivery", () => {
    expect(describeProduceError(new HttpError(401, "unauthorized"))).toContain("Authentication required");
    expect(describeProduceError(new HttpError(422, "invalid"))).toContain("rejected");
    expect(describeProduceError(new HttpError(503, "failed"))).toContain("may already have been written");
    expect(describeProduceError(new TypeError("network"))).toContain("may already have been written");
  });
});
