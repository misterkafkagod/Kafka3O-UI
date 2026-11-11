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
  // endOffset is the decimal sum of a topic's partition end offsets.
  endOffsets: { error?: string; topics: { topic: string; endOffset?: string; error?: string }[] };
  // M17 sections are optional so an older Gateway's answer still renders.
  quorum?: Quorum;
  brokers?: { error?: string; brokers: BrokerLeaders[] };
  consumerGroups?: { error?: string; states: StateCount[]; groups: GroupLag[] };
  connect?: { error?: string; notConfigured?: boolean; connectors: StateCount[]; tasks: StateCount[]; failures: ConnectFailure[] };
};

export type StateCount = { state: string; count: number };

// task is null for a failed connector.
export type ConnectFailure = { connector: string; task: number | null; error: string };

// lag and maxPartitionLag are exact decimal sums of the partitions with known lag; unknownPartitions makes lag a lower bound.
export type GroupLag = { group: string; state: string; members: number; lag: string | null; maxPartitionLag: string | null; unknownPartitions: number; error?: string };

export type BrokerLeaders = { broker: number; leaders: number; replicas: number; nonPreferredLeaders: number };

// lag is how far a replica's log end is behind the leader's (null when the leader's is unknown); times are ISO or null.
export type QuorumReplica = { id: number; role: string; logEndOffset: number; lag: number | null; lastFetch: string | null; lastCaughtUp: string | null };

export type Quorum = { error?: string; leaderId: number | null; leaderEpoch: number; highWatermark: number; replicas: QuorumReplica[] };

export type GetMetrics = (gatewayUrl: string) => Promise<ClusterMetrics>;

export async function getMetrics(fetchJson: FetchJson, gatewayUrl: string): Promise<ClusterMetrics> {
  return (await fetchJson(`${gatewayUrl.replace(/\/+$/, "")}/api/v1/metrics`)) as ClusterMetrics;
}
