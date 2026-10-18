import { ClusterCard } from "../components/ClusterCard";
import { NoGatewaysConfigured } from "../components/NoGatewaysConfigured";
import type { LoadGatewayConfig } from "../config/loadGatewayConfig";
import { useGatewayConfig } from "../hooks/useGatewayConfig";

export function ClustersPage({ loadGatewayConfig }: { loadGatewayConfig: LoadGatewayConfig }) {
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
        <ClusterCard key={gateway.id} gateway={gateway} />
      ))}
    </main>
  );
}
