import type { GetCluster } from "../gateway/getCluster";
import type { GatewayEntry } from "../gateway/types";
import { useClusterStatus } from "../hooks/useClusterStatus";
import { BrokerTable } from "./BrokerTable";
import styles from "./ClusterDetails.module.css";
import { ErrorWithRetry } from "./ErrorWithRetry";

type ClusterDetailsProps = {
  gateway: GatewayEntry;
  getCluster: GetCluster;
  statusRefreshMs: number;
};

export function ClusterDetails({ gateway, getCluster, statusRefreshMs }: ClusterDetailsProps) {
  const { data: cluster, isPending, isError, error, refetch } = useClusterStatus(gateway, getCluster, statusRefreshMs);

  return (
    <main>
      <header className={styles.header}>
        <h2>{gateway.name}</h2>
        <p>{gateway.url}</p>
      </header>
      {/* Error is checked before data: React Query keeps the last data after a failed refetch. */}
      {isError ? (
        <ErrorWithRetry error={error} gateway={gateway} onRetry={() => void refetch()} />
      ) : isPending ? (
        <p role="status">Checking…</p>
      ) : cluster ? (
        <>
          <section aria-labelledby="cluster-summary-heading">
            <h3 id="cluster-summary-heading">Cluster summary</h3>
            <dl className={styles.summary}>
              <div><dt>Cluster ID</dt><dd>{cluster.clusterId}</dd></div>
              <div><dt>Controller</dt><dd>{cluster.controllerId}</dd></div>
              <div><dt>Brokers</dt><dd>{cluster.brokers.length}</dd></div>
            </dl>
          </section>
          <section aria-labelledby="brokers-heading">
            <h3 id="brokers-heading">Brokers</h3>
            {cluster.brokers.length === 0 ? <p>No brokers reported.</p> : null}
            <BrokerTable brokers={cluster.brokers} />
          </section>
        </>
      ) : null}
    </main>
  );
}
