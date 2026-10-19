import { ClusterCard } from "../components/ClusterCard";
import { NoGatewaysConfigured } from "../components/NoGatewaysConfigured";
import type { LoadGatewayConfig } from "../config/loadGatewayConfig";
import type { GetCluster } from "../gateway/getCluster";
import { useGatewayConfig } from "../hooks/useGatewayConfig";

type ClustersPageProps = {
  loadGatewayConfig: LoadGatewayConfig;
  getCluster: GetCluster;
};

export function ClustersPage({ loadGatewayConfig, getCluster }: ClustersPageProps) {
  const { data: gateways } = useGatewayConfig(loadGatewayConfig);

  if (gateways === undefined) {
    return <p>Loading…</p>;
  }
  if (gateways.length === 0) {
    return <NoGatewaysConfigured />;
  }
  return (
    <main>
      {gateways.map((gateway) => (
        <ClusterCard key={gateway.id} gateway={gateway} getCluster={getCluster} />
      ))}
    </main>
  );
}
