import { ClusterCard } from "../components/ClusterCard";
import styles from "../components/ClusterOverview.module.css";
import { CrossClusterTopicSearch } from "../components/CrossClusterTopicSearch";
import { GatewayConfigError } from "../components/GatewayConfigError";
import { NoGatewaysConfigured } from "../components/NoGatewaysConfigured";
import type { LoadGatewayConfig } from "../config/loadGatewayConfig";
import type { GetCluster } from "../gateway/getCluster";
import type { ListTopics } from "../gateway/listTopics";
import { useGatewayConfig } from "../hooks/useGatewayConfig";

type ClustersPageProps = {
  loadGatewayConfig: LoadGatewayConfig;
  getCluster: GetCluster;
  listTopics: ListTopics;
  statusRefreshMs: number;
};

export function ClustersPage({ loadGatewayConfig, getCluster, listTopics, statusRefreshMs }: ClustersPageProps) {
  const { data: gateways, isError, refetch } = useGatewayConfig(loadGatewayConfig);

  if (isError) {
    return <GatewayConfigError onRetry={() => void refetch()} />;
  }
  if (gateways === undefined) {
    return <main><p role="status">Loading…</p></main>;
  }
  if (gateways.length === 0) {
    return <NoGatewaysConfigured />;
  }
  return (
    <main className={styles.overview}>
      <header className={styles.heading}>
        <h2>Clusters</h2>
        <p>{gateways.length} {gateways.length === 1 ? "gateway" : "gateways"} configured</p>
      </header>
      <CrossClusterTopicSearch gateways={gateways} listTopics={listTopics} />
      <section aria-label="Configured clusters" className={styles.grid}>
        {gateways.map((gateway) => (
          <ClusterCard key={gateway.id} gateway={gateway} getCluster={getCluster} statusRefreshMs={statusRefreshMs} />
        ))}
      </section>
    </main>
  );
}
