export type ConfigurationResource =
  | { kind: "topic"; name: string }
  | { kind: "broker"; id: number };

export type KafkaConfiguration = {
  name: string;
  value: string | null;
  sensitive: boolean;
  readOnly: boolean;
  source: string;
  type: string;
  documentation?: string;
};

export type ConfigurationChange = {
  name: string;
  operation: "set" | "reset";
  value: string | null;
};

export type PartitionReassignment = {
  partition: number;
  replicas: number[];
  addingReplicas: number[];
  removingReplicas: number[];
};

export type KafkaAdministration = {
  getConfigurations: (gatewayUrl: string, resource: ConfigurationResource) => Promise<KafkaConfiguration[]>;
  alterConfiguration: (gatewayUrl: string, resource: ConfigurationResource, change: ConfigurationChange) => Promise<void>;
  increasePartitions: (gatewayUrl: string, topic: string, count: number) => Promise<void>;
  listReassignments: (gatewayUrl: string, topic: string) => Promise<PartitionReassignment[]>;
  reassignPartition: (gatewayUrl: string, topic: string, partition: number, replicas: number[]) => Promise<void>;
  confirmChange: (message: string) => boolean;
};
