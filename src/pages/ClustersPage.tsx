import { ClusterCard } from "../components/ClusterCard";
import { CrossClusterTopicSearch } from "../components/CrossClusterTopicSearch";
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
  const { data: gateways } = useGatewayConfig(loadGatewayConfig);

  if (gateways === undefined) {
    return <p>Loading…</p>;
  }
  if (gateways.length === 0) {
    return <NoGatewaysConfigured />;
  }
  return (
    <main>
      <CrossClusterTopicSearch gateways={gateways} listTopics={listTopics} />
      {gateways.map((gateway) => (
        <ClusterCard key={gateway.id} gateway={gateway} getCluster={getCluster} statusRefreshMs={statusRefreshMs} />
      ))}
    </main>
  );
}
