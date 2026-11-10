// metricsFileName names a download after the cluster and the UTC read time, e.g. kafka-a-metrics-2026-11-10T12-00-00Z.csv.
export function metricsFileName(clusterId: string, readAt: string, extension: "json" | "csv"): string {
  const cluster = clusterId.replace(/[^A-Za-z0-9_-]/g, "_");
  const time = new Date(readAt).toISOString().replace(/\.\d{3}Z$/, "Z").replaceAll(":", "-");
  return `${cluster}-metrics-${time}.${extension}`;
}
