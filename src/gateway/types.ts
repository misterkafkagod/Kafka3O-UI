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
