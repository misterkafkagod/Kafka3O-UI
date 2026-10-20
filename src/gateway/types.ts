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

export type GatewayErrorKind = "gateway-unreachable" | "cluster-unreachable" | "other";

// RFC 9457 problem body sent by the gateway on errors (only the fields the UI uses).
export type Problem = {
  code?: string;
  detail?: string;
};
