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
  | { partition: number; offset: number }
  | { partition: number; timestamp: number };

export type TopicMessageSearchResult = {
  messages: TopicMessage[];
  scanned: number;
  truncated: boolean;
};

export type GatewayErrorKind = "gateway-unreachable" | "cluster-unreachable" | "other";

// RFC 9457 problem body sent by the gateway on errors (only the fields the UI uses).
export type Problem = {
  code?: string;
  detail?: string;
};
