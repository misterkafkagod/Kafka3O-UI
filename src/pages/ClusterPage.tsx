import { useParams } from "react-router";
import { ClusterDetails } from "../components/ClusterDetails";
import { ClusterNotFound } from "../components/ClusterNotFound";
import { ClusterTabs } from "../components/ClusterTabs";
import { ConsumerGroups } from "../components/ConsumerGroups";
import { CreateTopic } from "../components/CreateTopic";
import { GatewayConfigError } from "../components/GatewayConfigError";
import { TopicList } from "../components/TopicList";
import { findGatewayById } from "../config/findGatewayById";
import type { LoadGatewayConfig } from "../config/loadGatewayConfig";
import type { GetCluster } from "../gateway/getCluster";
import type { CreateTopic as CreateAction } from "../gateway/createTopic";
import type { ListConsumerGroups } from "../gateway/listConsumerGroups";
import type { ListTopics } from "../gateway/listTopics";
import { useGatewayConfig } from "../hooks/useGatewayConfig";
import styles from "./ClusterPage.module.css";

type ClusterPageProps = {
  loadGatewayConfig: LoadGatewayConfig;
  getCluster: GetCluster;
  listTopics: ListTopics;
  listConsumerGroups: ListConsumerGroups;
  createTopic: CreateAction;
  statusRefreshMs: number;
  view: "brokers" | "topics" | "consumer-groups";
};

export function ClusterPage({ loadGatewayConfig, getCluster, listTopics, listConsumerGroups, createTopic, statusRefreshMs, view }: ClusterPageProps) {
  const { gatewayId } = useParams();
  const { data: gateways, isError, refetch } = useGatewayConfig(loadGatewayConfig);

  if (isError) {
    return <GatewayConfigError onRetry={() => void refetch()} />;
  }
  if (gateways === undefined) {
    return <main><p role="status">Loading…</p></main>;
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
        <main>
          <h2>Topics</h2>
          <details className={styles.createTopic}>
            <summary>Create topic</summary>
            <CreateTopic key={gateway.id} gateway={gateway} createTopic={createTopic} />
          </details>
          <TopicList gateway={gateway} listTopics={listTopics} />
        </main>
      ) : (
        <ClusterDetails gateway={gateway} getCluster={getCluster} statusRefreshMs={statusRefreshMs} />
      )}
    </>
  );
}
