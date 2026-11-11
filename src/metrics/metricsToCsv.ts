import type { ClusterMetrics } from "../gateway/getMetrics";
import { escapeCsvField } from "./escapeCsvField";

type Row = [metric: string, broker: string, logDir: string, topic: string, name: string, value: string];

const value = (number: number | null | undefined) => (number === null || number === undefined ? "" : String(number));

// metricsToCsv writes one row per value; a value Kafka did not report, or a section it could not answer, is empty.
export function metricsToCsv(metrics: ClusterMetrics): string {
  const rows: Row[] = [["read_at", "", "", "", "", metrics.readAt]];
  for (const dir of metrics.logDirs.dirs) {
    const known = !dir.error && dir.totalBytes !== null && dir.usableBytes !== null;
    const where = (metric: string, number: number | null): Row => [metric, String(dir.broker), dir.dir, "", "", dir.error ? "" : value(number)];
    rows.push(
      where("log_dir_total_bytes", dir.totalBytes),
      where("log_dir_used_bytes", known ? dir.totalBytes! - dir.usableBytes! : null),
      where("log_dir_usable_bytes", dir.usableBytes),
      where("log_dir_kafka_bytes", dir.kafkaBytes),
    );
  }
  const partitions = metrics.partitions;
  const count = (metric: string, number: number | null): Row => [metric, "", "", "", "", partitions.error ? "" : value(number)];
  rows.push(
    count("topics", partitions.topics),
    count("partitions", partitions.partitions),
    count("partitions_under_replicated", partitions.underReplicated),
    count("partitions_below_min_isr", partitions.belowMinIsr),
    count("partitions_offline", partitions.offline),
  );
  for (const topic of metrics.largestTopics.topics) {
    rows.push(["topic_size_bytes", "", "", topic.topic, "", String(topic.bytes)]);
  }
  for (const topic of metrics.endOffsets.topics) {
    rows.push(["topic_end_offset", "", "", topic.topic, "", topic.endOffset ?? ""]);
  }
  const quorum = metrics.quorum;
  if (quorum) {
    rows.push(["quorum_leader", "", "", "", "", quorum.error ? "" : value(quorum.leaderId)]);
    rows.push(["quorum_high_watermark", "", "", "", "", quorum.error ? "" : value(quorum.highWatermark)]);
    for (const replica of quorum.error ? [] : quorum.replicas) {
      rows.push(["quorum_replica_lag", String(replica.id), "", "", replica.role, value(replica.lag)]);
    }
  }
  // name holds a group, replica role, connector or state for rows that need one.
  for (const broker of metrics.brokers?.error ? [] : metrics.brokers?.brokers ?? []) {
    rows.push(
      ["broker_leaders", String(broker.broker), "", "", "", String(broker.leaders)],
      ["broker_replicas", String(broker.broker), "", "", "", String(broker.replicas)],
      ["broker_non_preferred_leaders", String(broker.broker), "", "", "", String(broker.nonPreferredLeaders)],
    );
  }
  const consumerGroups = metrics.consumerGroups;
  for (const state of consumerGroups?.error ? [] : consumerGroups?.states ?? []) {
    rows.push(["consumer_groups", "", "", "", state.state, String(state.count)]);
  }
  for (const group of consumerGroups?.error ? [] : consumerGroups?.groups ?? []) {
    // A partly known lag is a lower bound, so it is left empty like any value Kafka did not fully report.
    const known = group.unknownPartitions === 0 && !group.error;
    rows.push(
      ["consumer_group_members", "", "", "", group.group, String(group.members)],
      ["consumer_group_lag", "", "", "", group.group, known ? group.lag ?? "" : ""],
      ["consumer_group_max_partition_lag", "", "", "", group.group, known ? group.maxPartitionLag ?? "" : ""],
      ["consumer_group_unknown_lag_partitions", "", "", "", group.group, String(group.unknownPartitions)],
    );
  }
  const connect = metrics.connect;
  if (connect && !connect.notConfigured && !connect.error) {
    for (const state of connect.connectors) rows.push(["connect_connectors", "", "", "", state.state, String(state.count)]);
    for (const state of connect.tasks) rows.push(["connect_tasks", "", "", "", state.state, String(state.count)]);
  }
  const backups = metrics.backups;
  if (backups && !backups.notConfigured && !backups.error) {
    for (const backup of backups.backups) {
      rows.push(
        ["backup_up", "", "", backup.topic, backup.state, backup.state === "RUNNING" ? "1" : "0"],
        ["backup_restoring", "", "", backup.topic, "", backup.restoring ? "1" : "0"],
        ["backup_stored_bytes", "", "", backup.topic, "", value(backup.storedBytes)],
        ["backup_last_write", "", "", backup.topic, "", backup.lastWrite ?? ""],
      );
    }
  }
  const header = "metric,broker,logDir,topic,name,value";
  return [header, ...rows.map((row) => row.map(escapeCsvField).join(","))].join("\r\n") + "\r\n";
}
