import { useParams } from "react-router";
import { ClusterDetails } from "../components/ClusterDetails";
import { ClusterNotFound } from "../components/ClusterNotFound";
import { ClusterTabs } from "../components/ClusterTabs";
import { TopicList } from "../components/TopicList";
import { findGatewayById } from "../config/findGatewayById";
import type { LoadGatewayConfig } from "../config/loadGatewayConfig";
import type { GetCluster } from "../gateway/getCluster";
import type { ListTopics } from "../gateway/listTopics";
import { useGatewayConfig } from "../hooks/useGatewayConfig";

type ClusterPageProps = {
  loadGatewayConfig: LoadGatewayConfig;
  getCluster: GetCluster;
  listTopics: ListTopics;
  statusRefreshMs: number;
  view: "brokers" | "topics";
};

export function ClusterPage({ loadGatewayConfig, getCluster, listTopics, statusRefreshMs, view }: ClusterPageProps) {
  const { gatewayId } = useParams();
  const { data: gateways } = useGatewayConfig(loadGatewayConfig);

  if (gateways === undefined) {
    return <p>Loading…</p>;
  }
  const gateway = findGatewayById(gateways, gatewayId);
  if (gateway === undefined) {
    return <ClusterNotFound gatewayId={gatewayId} />;
  }
  return (
    <>
      <ClusterTabs gatewayId={gateway.id} view={view} />
      {view === "topics" ? (
        <TopicList gateway={gateway} listTopics={listTopics} />
      ) : (
        <ClusterDetails gateway={gateway} getCluster={getCluster} statusRefreshMs={statusRefreshMs} />
      )}
    </>
  );
}
