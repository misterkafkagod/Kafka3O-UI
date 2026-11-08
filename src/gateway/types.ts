export type GatewayEntry = {
  id: string;
  name: string;
  url: string;
};

export type Broker = {
  id: number;
  host: string;
  port: number;
  rack?: string;
};

export type ClusterInfo = {
  clusterId: string;
  controllerId: number;
  brokers: Broker[];
};

export type Topic = {
  name: string;
  partitions: number;
  replicationFactor: number;
  internal: boolean;
  approxMessages: number;
};

export type TopicDetail = {
  name: string;
  partitions: TopicPartition[];
  config: TopicConfig[];
};

export type TopicPartition = {
  id: number;
  leader: number;
  replicas: number[];
  isr: number[];
  startOffset: number;
  endOffset: number;
};

export type TopicConfig = {
  name: string;
  value: string;
  sensitive: boolean;
};

export type TopicMessage = {
  partition: number;
  offset: number;
  offsetExact?: string;
  timestamp: string;
  key: string | null;
  value: string | null;
  headers: TopicMessageHeader[];
};

export type TopicMessageHeader = {
  key: string;
  value: string | null;
};

export type TopicMessagePosition =
  | { partition: number; offset: number | string }
  | { partition: number; timestamp: number };

export type TopicMessageSearchResult = {
  messages: TopicMessage[];
  scanned: number;
  truncated: boolean;
};

export type ConsumerGroupMember = {
  id: string;
  clientId: string;
  clientHost: string;
  instanceId?: string;
};

export type ConsumerGroupPartition = {
  topic: string;
  partition: number;
  committedOffset: string | null;
  startOffset: string | null;
  endOffset: string | null;
  lag: string | null;
  status: "ok" | "no_commit" | "out_of_range" | "unavailable";
  error?: string;
};

export type ConsumerGroup = {
  id: string;
  protocol: "classic" | "consumer";
  state: string;
  members: ConsumerGroupMember[];
  topics: string[];
  partitions: ConsumerGroupPartition[];
  error?: string;
};

export type GatewayErrorKind = "authentication-required" | "gateway-unreachable" | "cluster-unreachable"
  | "access-denied" | "authorization-unavailable" | "outcome-unknown" | "other";

// RFC 9457 problem body sent by the gateway on errors (only the fields the UI uses).
export type Problem = {
  code?: string;
  detail?: string;
};
