import { describe, expect, it } from "vitest";
import { filterTopics } from "./filterTopics";

const topic = (name: string, internal = false) => ({ name, partitions: 1, replicationFactor: 1, internal, approxMessages: 0 });
const orders = topic("orders");
const offsets = topic("__consumer_offsets", true);

describe("filterTopics", () => {
  it("drops internal topics when showInternal is off", () => {
    expect(filterTopics([orders, offsets], { showInternal: false })).toEqual([orders]);
  });

  it("keeps internal topics when showInternal is on", () => {
    expect(filterTopics([orders, offsets], { showInternal: true })).toEqual([orders, offsets]);
  });

  it("returns an empty list for no topics", () => {
    expect(filterTopics([], { showInternal: false })).toEqual([]);
  });
});
