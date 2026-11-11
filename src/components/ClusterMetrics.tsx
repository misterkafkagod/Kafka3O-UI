import type { GetMetrics } from "../gateway/getMetrics";
import type { GatewayEntry } from "../gateway/types";
import { useMetrics } from "../hooks/useMetrics";
import { useMetricsSamples } from "../hooks/useMetricsSamples";
import { saveFile as browserSaveFile, type SaveFile } from "../metrics/saveFile";
import { BrokerDiskUse } from "./BrokerDiskUse";
import { ErrorWithRetry } from "./ErrorWithRetry";
import { LargestTopics } from "./LargestTopics";
import { MetricsDownload } from "./MetricsDownload";
import { PartitionHealth } from "./PartitionHealth";
import { QuorumHealth } from "./QuorumHealth";
import { TopicThroughput } from "./TopicThroughput";

type ClusterMetricsProps = {
  gateway: GatewayEntry;
  getMetrics: GetMetrics;
  saveFile?: SaveFile;
};

export function ClusterMetrics({ gateway, getMetrics, saveFile = browserSaveFile }: ClusterMetricsProps) {
  const { data: metrics, isError, error, refetch } = useMetrics(gateway, getMetrics);
  const previous = useMetricsSamples(metrics);

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
          <p>
            Read at {new Date(metrics.readAt).toLocaleString()}{" "}
            <button type="button" onClick={() => void refetch()}>Refresh now</button>
          </p>
          <MetricsDownload clusterId={gateway.id} metrics={metrics} saveFile={saveFile} />
          <PartitionHealth partitions={metrics.partitions} />
          {metrics.quorum ? <QuorumHealth quorum={metrics.quorum} /> : null}
          <BrokerDiskUse logDirs={metrics.logDirs} />
          <TopicThroughput previous={previous} current={metrics} />
          <LargestTopics largestTopics={metrics.largestTopics} />
        </>
      )}
    </main>
  );
}
