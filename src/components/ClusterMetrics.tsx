import type { GetMetrics } from "../gateway/getMetrics";
import type { GatewayEntry } from "../gateway/types";
import { useMetrics } from "../hooks/useMetrics";
import { BrokerDiskUse } from "./BrokerDiskUse";
import { ErrorWithRetry } from "./ErrorWithRetry";

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
          <BrokerDiskUse logDirs={metrics.logDirs} />
        </>
      )}
    </main>
  );
}
