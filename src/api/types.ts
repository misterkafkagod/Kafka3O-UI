// Response shapes of the Kafka3O gateway API (see SPEC.md, Architecture).

export interface Health {
  gateway: 'up';
  cluster: { reachable: boolean; error?: string };
}

export interface Broker {
  id: number;
  host: string;
  port: number;
  rack: string | null;
}

export interface ClusterInfo {
  clusterId: string;
  controllerId: number;
  brokers: Broker[];
}

export interface ErrorBody {
  error: { code: string; message: string };
}
