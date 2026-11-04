import { describe, expect, it } from "vitest";
import type { ConsumerGroup } from "../gateway/types";
import { topicConsumerGroups } from "./topicConsumerGroups";

const group: ConsumerGroup = {
  id: "reader", protocol: "consumer", state: "Stable", members: [], topics: ["orders", "audit"],
  partitions: [
    { topic: "orders", partition: 0, committedOffset: "1", startOffset: "0", endOffset: "2", lag: "1", status: "ok" },
    { topic: "audit", partition: 0, committedOffset: null, startOffset: "0", endOffset: "0", lag: null, status: "no_commit" },
  ],
};

describe("topicConsumerGroups", () => {
  it("filters associated groups and their partition rows without mutating the input", () => {
    const other = { ...group, id: "other", topics: ["audit"] };
    const unknown = { ...other, id: "unknown", error: "access denied" };
    const got = topicConsumerGroups([group, other, unknown], "orders");

    expect(got.associated).toHaveLength(1);
    expect(got.associated[0].partitions.map((row) => row.topic)).toEqual(["orders"]);
    expect(got.unresolved.map((entry) => entry.id)).toEqual(["unknown"]);
    expect(group.partitions).toHaveLength(2);
  });
});
