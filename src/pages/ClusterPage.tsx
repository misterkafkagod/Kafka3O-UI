import { useParams } from "react-router";
import { ClusterDetails } from "../components/ClusterDetails";
import { findGatewayById } from "../config/findGatewayById";
import type { LoadGatewayConfig } from "../config/loadGatewayConfig";
import type { GetCluster } from "../gateway/getCluster";
import { useGatewayConfig } from "../hooks/useGatewayConfig";

type ClusterPageProps = {
  loadGatewayConfig: LoadGatewayConfig;
  getCluster: GetCluster;
  statusRefreshMs: number;
};

export function ClusterPage({ loadGatewayConfig, getCluster, statusRefreshMs }: ClusterPageProps) {
  const { gatewayId } = useParams();
  const { data: gateways } = useGatewayConfig(loadGatewayConfig);

  if (gateways === undefined) {
    return <p>Loading…</p>;
  }
  const gateway = findGatewayById(gateways, gatewayId);
  if (gateway === undefined) {
    return null;
  }
  return <ClusterDetails gateway={gateway} getCluster={getCluster} statusRefreshMs={statusRefreshMs} />;
}
