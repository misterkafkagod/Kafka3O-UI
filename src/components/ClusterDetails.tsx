import type { GetCluster } from "../gateway/getCluster";
import type { GatewayEntry } from "../gateway/types";
import { useClusterStatus } from "../hooks/useClusterStatus";
import { BrokerTable } from "./BrokerTable";

type ClusterDetailsProps = {
  gateway: GatewayEntry;
  getCluster: GetCluster;
  statusRefreshMs: number;
};

export function ClusterDetails({ gateway, getCluster, statusRefreshMs }: ClusterDetailsProps) {
  const { data: cluster, isPending } = useClusterStatus(gateway, getCluster, statusRefreshMs);

  return (
    <main>
      <h2>{gateway.name}</h2>
      <p>{gateway.url}</p>
      {isPending ? (
        <p>Checking…</p>
      ) : cluster ? (
        <>
          <p>Cluster ID: {cluster.clusterId}</p>
          <p>Controller: {cluster.controllerId}</p>
          <BrokerTable brokers={cluster.brokers} />
        </>
      ) : null}
    </main>
  );
}
