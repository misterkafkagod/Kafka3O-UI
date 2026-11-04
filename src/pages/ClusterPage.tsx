import { useParams } from "react-router";
import { ClusterDetails } from "../components/ClusterDetails";
import { ClusterNotFound } from "../components/ClusterNotFound";
import { ClusterTabs } from "../components/ClusterTabs";
import { ConsumerGroups } from "../components/ConsumerGroups";
import { TopicList } from "../components/TopicList";
import { findGatewayById } from "../config/findGatewayById";
import type { LoadGatewayConfig } from "../config/loadGatewayConfig";
import type { GetCluster } from "../gateway/getCluster";
import type { ListConsumerGroups } from "../gateway/listConsumerGroups";
import type { ListTopics } from "../gateway/listTopics";
import { useGatewayConfig } from "../hooks/useGatewayConfig";

type ClusterPageProps = {
  loadGatewayConfig: LoadGatewayConfig;
  getCluster: GetCluster;
  listTopics: ListTopics;
  listConsumerGroups: ListConsumerGroups;
  statusRefreshMs: number;
  view: "brokers" | "topics" | "consumer-groups";
};

export function ClusterPage({ loadGatewayConfig, getCluster, listTopics, listConsumerGroups, statusRefreshMs, view }: ClusterPageProps) {
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
      {view === "consumer-groups" ? (
        <ConsumerGroups gateway={gateway} listConsumerGroups={listConsumerGroups} />
      ) : view === "topics" ? (
        <TopicList gateway={gateway} listTopics={listTopics} />
      ) : (
        <ClusterDetails gateway={gateway} getCluster={getCluster} statusRefreshMs={statusRefreshMs} />
      )}
    </>
  );
}
