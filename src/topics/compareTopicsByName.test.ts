import { describe, expect, it } from "vitest";
import { compareTopicsByName } from "./compareTopicsByName";

const topic = (name: string) => ({ name, partitions: 1, replicationFactor: 1, internal: false, approxMessages: 0 });

describe("compareTopicsByName", () => {
  it("orders by ascending name", () => {
    expect(compareTopicsByName(topic("audit"), topic("orders"))).toBeLessThan(0);
    expect(compareTopicsByName(topic("orders"), topic("orders"))).toBe(0);
    expect(compareTopicsByName(topic("orders"), topic("audit"))).toBeGreaterThan(0);
  });
});
