import { describe, expect, it } from "vitest";
import { filterTopics } from "./filterTopics";

const topic = (name: string, internal = false) => ({ name, partitions: 1, replicationFactor: 1, internal, approxMessages: 0 });
const orders = topic("orders");
const audit = topic("audit");
const offsets = topic("__consumer_offsets", true);

describe("filterTopics", () => {
  it("drops internal topics when showInternal is off", () => {
    expect(filterTopics([orders, offsets], { showInternal: false, text: "" })).toEqual([orders]);
  });

  it("keeps internal topics when showInternal is on", () => {
    expect(filterTopics([orders, offsets], { showInternal: true, text: "" })).toEqual([orders, offsets]);
  });

  it("returns an empty list for no topics", () => {
    expect(filterTopics([], { showInternal: false, text: "" })).toEqual([]);
  });

  it("keeps topics whose name contains the text, ignoring case", () => {
    expect(filterTopics([orders, audit], { showInternal: false, text: "ORD" })).toEqual([orders]);
    expect(filterTopics([orders, audit], { showInternal: false, text: "di" })).toEqual([audit]);
  });

  it("combines the text with showInternal", () => {
    expect(filterTopics([orders, offsets], { showInternal: false, text: "offsets" })).toEqual([]);
    expect(filterTopics([orders, offsets], { showInternal: true, text: "offsets" })).toEqual([offsets]);
  });

  it("returns nothing when no name matches", () => {
    expect(filterTopics([orders, audit], { showInternal: false, text: "zzz" })).toEqual([]);
  });
});
