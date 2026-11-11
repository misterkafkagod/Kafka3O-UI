import { describe, expect, it } from "vitest";
import type { ClusterMetrics } from "../gateway/getMetrics";
import { metricsToCsv } from "./metricsToCsv";

const metrics: ClusterMetrics = {
  readAt: "2026-11-10T12:00:00Z",
  logDirs: { dirs: [
    { broker: 1, dir: "/data", totalBytes: 100, usableBytes: 60, kafkaBytes: 7 },
    { broker: 2, dir: "/data,b", totalBytes: null, usableBytes: null, kafkaBytes: 3 },
    { broker: 3, dir: "/broken", totalBytes: null, usableBytes: null, kafkaBytes: 0, error: "KAFKA_STORAGE_ERROR" },
  ] },
  partitions: { topics: 2, partitions: 4, underReplicated: 1, offline: 0, belowMinIsr: null, minIsrError: "denied", unreadableTopics: [] },
  largestTopics: { topics: [{ topic: "orders", bytes: 7 }] },
  endOffsets: { topics: [{ topic: "orders", endOffset: "9007199254740993" }, { topic: "failing", error: "NOT_LEADER" }] },
};

describe("metricsToCsv", () => {
  it("writes one row per value with unreported values left empty", () => {
    expect(metricsToCsv(metrics).split("\r\n")).toEqual([
      "metric,broker,logDir,topic,name,value",
      "read_at,,,,,2026-11-10T12:00:00Z",
      "log_dir_total_bytes,1,/data,,,100",
      "log_dir_used_bytes,1,/data,,,40",
      "log_dir_usable_bytes,1,/data,,,60",
      "log_dir_kafka_bytes,1,/data,,,7",
      'log_dir_total_bytes,2,"/data,b",,,',
      'log_dir_used_bytes,2,"/data,b",,,',
      'log_dir_usable_bytes,2,"/data,b",,,',
      'log_dir_kafka_bytes,2,"/data,b",,,3',
      "log_dir_total_bytes,3,/broken,,,",
      "log_dir_used_bytes,3,/broken,,,",
      "log_dir_usable_bytes,3,/broken,,,",
      "log_dir_kafka_bytes,3,/broken,,,",
      "topics,,,,,2",
      "partitions,,,,,4",
      "partitions_under_replicated,,,,,1",
      "partitions_below_min_isr,,,,,",
      "partitions_offline,,,,,0",
      "topic_size_bytes,,,orders,,7",
      "topic_end_offset,,,orders,,9007199254740993",
      "topic_end_offset,,,failing,,",
      "",
    ]);
  });

  it("leaves every partition count empty when the section is unavailable", () => {
    const csv = metricsToCsv({ ...metrics, partitions: { ...metrics.partitions, error: "refused" } });
    expect(csv).toContain("topics,,,,,\r\npartitions,,,,,\r\n");
  });

  it("writes the quorum with the replica role as name", () => {
    const lines = metricsToCsv({ ...metrics, quorum: { leaderId: 1, leaderEpoch: 3, highWatermark: 894587,
      replicas: [{ id: 1, role: "voter", logEndOffset: 894587, lag: 0, lastFetch: null, lastCaughtUp: null }, { id: 4, role: "observer", logEndOffset: 5, lag: null, lastFetch: null, lastCaughtUp: null }] } }).split("\r\n");
    expect(lines).toContain("quorum_leader,,,,,1");
    expect(lines).toContain("quorum_high_watermark,,,,,894587");
    expect(lines).toContain("quorum_replica_lag,1,,,voter,0");
    expect(lines).toContain("quorum_replica_lag,4,,,observer,");
    const failed = metricsToCsv({ ...metrics, quorum: { error: "denied", leaderId: null, leaderEpoch: 0, highWatermark: 0, replicas: [] } }).split("\r\n");
    expect(failed).toContain("quorum_leader,,,,,");
    expect(failed).toContain("quorum_high_watermark,,,,,");
  });

  it("writes leaders, replicas and non-preferred leaders per broker", () => {
    const lines = metricsToCsv({ ...metrics, brokers: { brokers: [{ broker: 1, leaders: 39, replicas: 40, nonPreferredLeaders: 2 }] } }).split("\r\n");
    expect(lines).toEqual(expect.arrayContaining(["broker_leaders,1,,,,39", "broker_replicas,1,,,,40", "broker_non_preferred_leaders,1,,,,2"]));
    expect(metricsToCsv({ ...metrics, brokers: { error: "timeout", brokers: [] } })).not.toContain("broker_leaders");
  });
});

