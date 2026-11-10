import type { FetchJson } from "./fetchJson";

// LogDir sizes are bytes; null means Kafka did not report the volume's size.
export type LogDir = { broker: number; dir: string; totalBytes: number | null; usableBytes: number | null; kafkaBytes: number; error?: string };

// ClusterMetrics is what Kafka reports; a section with an error has no values.
export type ClusterMetrics = {
  readAt: string;
  logDirs: { error?: string; dirs: LogDir[] };
  // belowMinIsr is null when a topic's min.insync.replicas could not be read (minIsrError says why).
  partitions: {
    error?: string; topics: number; partitions: number; underReplicated: number; offline: number;
    belowMinIsr: number | null; minIsrError?: string; unreadableTopics: string[];
  };
  largestTopics: { error?: string; topics: { topic: string; bytes: number }[] };
};

export type GetMetrics = (gatewayUrl: string) => Promise<ClusterMetrics>;

export async function getMetrics(fetchJson: FetchJson, gatewayUrl: string): Promise<ClusterMetrics> {
  return (await fetchJson(`${gatewayUrl.replace(/\/+$/, "")}/api/v1/metrics`)) as ClusterMetrics;
}
