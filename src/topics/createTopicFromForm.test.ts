import { describe, expect, it } from "vitest";
import { createTopicFromForm } from "./createTopicFromForm";

describe("createTopicFromForm", () => {
  it("accepts the Kafka name and count boundaries", () => {
    expect(createTopicFromForm("x".repeat(249), "2147483647", "32767").input).toEqual({
      name: "x".repeat(249), partitions: 2147483647, replicationFactor: 32767,
    });
  });
  it.each([
    ["", "1", "1"], [".", "1", "1"], ["..", "1", "1"], ["a/b", "1", "1"], ["orders\n", "1", "1"],
    ["x".repeat(250), "1", "1"], ["orders", "0", "1"], ["orders", "2147483648", "1"],
    ["orders", "1.5", "1"], ["orders", "1\n", "1"], ["orders", "1", "0"], ["orders", "1", "32768"],
  ])("rejects invalid parameters %#", (name, partitions, replicationFactor) => {
    expect(createTopicFromForm(name, partitions, replicationFactor).error).toBeDefined();
  });
});
