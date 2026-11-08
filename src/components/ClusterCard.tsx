import { Link } from "react-router";
import { describeEnvironment } from "../console/describeEnvironment";
import { classifyGatewayError } from "../gateway/classifyGatewayError";
import { describeGatewayTransportFailure } from "../gateway/describeGatewayTransportFailure";
import type { GetCluster } from "../gateway/getCluster";
import { HttpError } from "../gateway/HttpError";
import type { GatewayEntry } from "../gateway/types";
import { useClusterStatus } from "../hooks/useClusterStatus";
import styles from "./ClusterOverview.module.css";
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
    <article aria-label={gateway.name} className={styles.card}>
      <h3>
        <Link to={`/clusters/${encodeURIComponent(gateway.id)}`}>{gateway.name}</Link>
      </h3>
      {gateway.environment === undefined ? <p className={styles.endpoint}>{gateway.url}</p> : (
        <p className={`${styles.environment} ${gateway.environment === "PRODUCTION" ? styles.production : ""}`}>
          {describeEnvironment(gateway.environment)}
        </p>
      )}
      {errorKind === "authentication-required" ? (
        <>
          <p className={`${styles.status} ${styles.failure}`}>Authentication required</p>
          <p>Enter or update this gateway's token.</p>
          <GatewayCredentialAction gateway={gateway} />
        </>
      ) : errorKind === "gateway-unreachable" ? (
        <>
          <p className={`${styles.status} ${styles.failure}`}>Gateway unreachable</p>
          <p>{describeGatewayTransportFailure(gateway.url)}</p>
        </>
      ) : errorKind === "cluster-unreachable" ? (
        <>
          <p className={`${styles.status} ${styles.failure}`}>Cluster unreachable</p>
          <p>{error instanceof HttpError ? error.problem?.detail : undefined}</p>
        </>
      ) : errorKind === "other" ? (
        <>
          <p className={`${styles.status} ${styles.failure}`}>Status unavailable</p>
          {error instanceof HttpError && error.problem?.code?.startsWith("manual_gateway_") && error.problem.detail
            ? <p>{error.problem.detail}</p>
            : error instanceof Error ? <p>{error.message}</p> : null}
        </>
      ) : cluster ? (
        <>
          <p className={`${styles.status} ${styles.healthy}`}>Healthy</p>
          <p>Cluster ID: {cluster.clusterId}</p>
          <p>{cluster.brokers.length === 1 ? "1 broker" : `${cluster.brokers.length} brokers`}</p>
        </>
      ) : (
        <p role="status" className={styles.status}>Checking…</p>
      )}
    </article>
  );
}
