import { describe, expect, it } from "vitest";
import { consumerGroupAnchor } from "./consumerGroupAnchor";

describe("consumerGroupAnchor", () => {
  it("preserves the group ID for a matching document fragment", () => {
    expect(consumerGroupAnchor("reader & west/1")).toBe("consumer-group-reader & west/1");
  });
});
