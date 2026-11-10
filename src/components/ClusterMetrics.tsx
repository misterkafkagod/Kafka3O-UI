import type { GetMetrics } from "../gateway/getMetrics";
import type { GatewayEntry } from "../gateway/types";
import { useMetrics } from "../hooks/useMetrics";
import { BrokerDiskUse } from "./BrokerDiskUse";
import { ErrorWithRetry } from "./ErrorWithRetry";
import { LargestTopics } from "./LargestTopics";
import { PartitionHealth } from "./PartitionHealth";

type ClusterMetricsProps = {
  gateway: GatewayEntry;
  getMetrics: GetMetrics;
};

export function ClusterMetrics({ gateway, getMetrics }: ClusterMetricsProps) {
  const { data: metrics, isError, error, refetch } = useMetrics(gateway, getMetrics);

  return (
    <main>
      <h2>Metrics</h2>
      <p>As reported by Kafka; refreshed every 10 seconds.</p>
      {isError ? (
        <ErrorWithRetry error={error} gateway={gateway} onRetry={() => void refetch()} />
      ) : metrics === undefined ? (
        <p role="status">Loading metrics…</p>
      ) : (
        <>
          <p>Read at {new Date(metrics.readAt).toLocaleString()}</p>
          <PartitionHealth partitions={metrics.partitions} />
          <BrokerDiskUse logDirs={metrics.logDirs} />
          <LargestTopics largestTopics={metrics.largestTopics} />
        </>
      )}
    </main>
  );
}
