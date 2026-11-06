import { Link } from "react-router";
import { classifyGatewayError } from "../gateway/classifyGatewayError";
import type { GetCluster } from "../gateway/getCluster";
import { HttpError } from "../gateway/HttpError";
import type { GatewayEntry } from "../gateway/types";
import { useClusterStatus } from "../hooks/useClusterStatus";
import { GatewayCredentialAction } from "./GatewayCredentialAction";

type ClusterCardProps = {
  gateway: GatewayEntry;
  getCluster: GetCluster;
  statusRefreshMs: number;
};

export function ClusterCard({ gateway, getCluster, statusRefreshMs }: ClusterCardProps) {
  const { data: cluster, isError, error } = useClusterStatus(gateway, getCluster, statusRefreshMs);
  // Error is checked before data: React Query keeps the last data after a failed refetch.
  const errorKind = isError ? classifyGatewayError(error) : undefined;

  return (
    <article aria-label={gateway.name}>
      <h2>
        <Link to={`/clusters/${gateway.id}`}>{gateway.name}</Link>
      </h2>
      <p>{gateway.url}</p>
      {errorKind === "authentication-required" ? (
        <>
          <p>Authentication required</p>
          <p>Enter or update this gateway's token.</p>
          <GatewayCredentialAction gateway={gateway} />
        </>
      ) : errorKind === "gateway-unreachable" ? (
        <>
          <p>Gateway unreachable</p>
          <p>Check the connection and that the gateway's HTTPS certificate is trusted.</p>
        </>
      ) : errorKind === "cluster-unreachable" ? (
        <>
          <p>Cluster unreachable</p>
          <p>{error instanceof HttpError ? error.problem?.detail : undefined}</p>
        </>
      ) : errorKind === "other" ? (
        <>
          <p>Status unavailable</p>
          {error instanceof Error ? <p>{error.message}</p> : null}
        </>
      ) : cluster ? (
        <>
          <p>Healthy</p>
          <p>Cluster ID: {cluster.clusterId}</p>
          <p>{cluster.brokers.length === 1 ? "1 broker" : `${cluster.brokers.length} brokers`}</p>
        </>
      ) : (
        <p role="status">Checking…</p>
      )}
    </article>
  );
}
