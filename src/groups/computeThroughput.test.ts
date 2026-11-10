import { describe, expect, it } from "vitest";
import type { ClusterMetrics } from "../gateway/getMetrics";
import { computeThroughput } from "./computeThroughput";

const sample = (readAt: string, topics: ClusterMetrics["endOffsets"]["topics"]): ClusterMetrics => ({
  readAt,
  logDirs: { dirs: [] },
  partitions: { topics: 0, partitions: 0, underReplicated: 0, offline: 0, belowMinIsr: 0, unreadableTopics: [] },
  largestTopics: { topics: [] },
  endOffsets: { topics },
});

describe("computeThroughput", () => {
  it("divides each topic's end-offset change by the seconds between samples", () => {
    const got = computeThroughput(
      sample("2026-11-10T12:00:00Z", [{ topic: "orders", endOffset: "9007199254740993" }, { topic: "audit", endOffset: "4" }]),
      sample("2026-11-10T12:00:10Z", [{ topic: "orders", endOffset: "9007199254741093" }, { topic: "audit", endOffset: "4" }]),
    );
    expect(got).toEqual({ cluster: 10, seconds: 10, topics: [{ topic: "orders", perSecond: 10 }, { topic: "audit", perSecond: 0 }] });
  });

  it("gives no rate for a decrease, a new topic or an error", () => {
    const got = computeThroughput(
      sample("2026-11-10T12:00:00Z", [{ topic: "recreated", endOffset: "50" }, { topic: "failing", endOffset: "1" }]),
      sample("2026-11-10T12:00:10Z", [{ topic: "recreated", endOffset: "3" }, { topic: "new", endOffset: "7" }, { topic: "failing", error: "partition 0: NOT_LEADER" }]),
    );
    expect(got).toEqual({ cluster: null, seconds: 10, topics: [{ topic: "recreated", perSecond: null }, { topic: "new", perSecond: null }, { topic: "failing", perSecond: null }] });
  });

  it("gives no rate when the samples were read at the same time", () => {
    const same = sample("2026-11-10T12:00:00Z", [{ topic: "orders", endOffset: "1" }]);
    expect(computeThroughput(same, same).topics).toEqual([{ topic: "orders", perSecond: null }]);
  });
});
