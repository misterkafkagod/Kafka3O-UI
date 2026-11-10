import { describe, expect, it } from "vitest";
import type { ConsumerGroup, ConsumerGroupPartition } from "../gateway/types";
import { consumerGroupTotalLag } from "./consumerGroupTotalLag";

const partition: ConsumerGroupPartition = { topic: "orders", partition: 0, committedOffset: "1", startOffset: "0", endOffset: "3", lag: "2", status: "ok" };
const group = (partitions: ConsumerGroupPartition[]): ConsumerGroup => ({ id: "g", protocol: "classic", state: "Empty", members: [], topics: ["orders"], partitions });

describe("consumerGroupTotalLag", () => {
  it("sums exact lags beyond the safe integer range", () => {
    expect(consumerGroupTotalLag(group([{ ...partition, lag: "9007199254740993" }, { ...partition, partition: 1, lag: "2" }])))
      .toEqual({ kind: "known", lag: "9007199254740995" });
  });

  it("is unknown when any partition has no lag", () => {
    expect(consumerGroupTotalLag(group([partition, { ...partition, partition: 1, lag: null, status: "no_commit" }, { ...partition, partition: 2, lag: null, status: "unavailable" }])))
      .toEqual({ kind: "unknown", partitions: 2 });
  });

  it("reports no partitions", () => {
    expect(consumerGroupTotalLag(group([]))).toEqual({ kind: "none" });
  });
});
