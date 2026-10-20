import { classifyGatewayError } from "../gateway/classifyGatewayError";
import type { GetCluster } from "../gateway/getCluster";
import { HttpError } from "../gateway/HttpError";
import type { GatewayEntry } from "../gateway/types";
import { useClusterStatus } from "../hooks/useClusterStatus";

type ClusterCardProps = {
  gateway: GatewayEntry;
  getCluster: GetCluster;
};

export function ClusterCard({ gateway, getCluster }: ClusterCardProps) {
  const { data: cluster, isError, error } = useClusterStatus(gateway, getCluster);
  const errorKind = isError ? classifyGatewayError(error) : undefined;

  return (
    <article aria-label={gateway.name}>
      <h2>{gateway.name}</h2>
      <p>{gateway.url}</p>
      {cluster ? (
        <>
          <p>Healthy</p>
          <p>Cluster ID: {cluster.clusterId}</p>
          <p>{cluster.brokers.length === 1 ? "1 broker" : `${cluster.brokers.length} brokers`}</p>
        </>
      ) : errorKind === "gateway-unreachable" ? (
        <p>Gateway unreachable</p>
      ) : errorKind === "cluster-unreachable" ? (
        <>
          <p>Cluster unreachable</p>
          <p>{error instanceof HttpError ? error.problem?.detail : undefined}</p>
        </>
      ) : errorKind === "other" ? (
        <p>Status unavailable</p>
      ) : (
        <p>Checking…</p>
      )}
    </article>
  );
}
