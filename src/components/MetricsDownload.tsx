import type { ClusterMetrics } from "../gateway/getMetrics";
import { metricsFileName } from "../metrics/metricsFileName";
import { metricsToCsv } from "../metrics/metricsToCsv";
import type { SaveFile } from "../metrics/saveFile";

type MetricsDownloadProps = {
  clusterId: string;
  metrics: ClusterMetrics;
  saveFile: SaveFile;
};

// MetricsDownload saves the metrics already on screen; it sends no request of its own.
export function MetricsDownload({ clusterId, metrics, saveFile }: MetricsDownloadProps) {
  return (
    <p>
      <button type="button" onClick={() => saveFile(metricsFileName(clusterId, metrics.readAt, "json"), "application/json", `${JSON.stringify(metrics, null, 2)}\n`)}>
        Download JSON
      </button>{" "}
      <button type="button" onClick={() => saveFile(metricsFileName(clusterId, metrics.readAt, "csv"), "text/csv", metricsToCsv(metrics))}>
        Download CSV
      </button>
    </p>
  );
}
