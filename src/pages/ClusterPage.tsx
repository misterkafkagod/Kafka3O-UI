import { useParams } from "react-router";
import { ClusterDetails } from "../components/ClusterDetails";
import { ClusterMetrics } from "../components/ClusterMetrics";
import { ClusterNotFound } from "../components/ClusterNotFound";
import { ClusterTabs } from "../components/ClusterTabs";
import { ClusterBackups } from "../components/ClusterBackups";
import { ConnectConnectors } from "../components/ConnectConnectors";
import { ConsumerGroupPage } from "../components/ConsumerGroupPage";
import { ConsumerGroups } from "../components/ConsumerGroups";
import { CreateTopic } from "../components/CreateTopic";
import { GatewayConfigError } from "../components/GatewayConfigError";
import { TopicList } from "../components/TopicList";
import { findGatewayById } from "../config/findGatewayById";
import type { LoadGatewayConfig } from "../config/loadGatewayConfig";
import type { GetCluster } from "../gateway/getCluster";
import type { CreateTopic as CreateAction } from "../gateway/createTopic";
import type { GetMetrics } from "../gateway/getMetrics";
import type { ListConnectors } from "../gateway/listConnectors";
import type { ConnectorActions } from "../gateway/runConnectorAction";
import type { ListBackups } from "../gateway/listBackups";
import { backupsNotConfigured } from "../gateway/backupsNotConfigured";
import type { ListConsumerGroups } from "../gateway/listConsumerGroups";
import { connectNotConfigured } from "../gateway/connectNotConfigured";
import type { OffsetResetActions } from "../gateway/OffsetResetActions";
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
  view: "brokers" | "metrics" | "topics" | "consumer-groups" | "connect" | "backups";
  getMetrics?: GetMetrics;
  listBackups?: ListBackups;
  listConnectors?: ListConnectors;
  connectorActions?: ConnectorActions;
  offsetReset?: OffsetResetActions;
};

export function ClusterPage({ loadGatewayConfig, getCluster, listTopics, listConsumerGroups, createTopic, statusRefreshMs, view, offsetReset, getMetrics, listConnectors = connectNotConfigured, connectorActions, listBackups = backupsNotConfigured }: ClusterPageProps) {
  const { gatewayId, groupId } = useParams();
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
      {view === "metrics" ? (
        getMetrics ? <ClusterMetrics gateway={gateway} getMetrics={getMetrics} /> : <main><h2>Metrics</h2><p>Metrics are not available in this console.</p></main>
      ) : view === "backups" ? (
        <ClusterBackups gateway={gateway} listBackups={listBackups} />
      ) : view === "connect" ? (
        <ConnectConnectors gateway={gateway} listConnectors={listConnectors} actions={connectorActions} />
      ) : view === "consumer-groups" && groupId !== undefined ? (
        <ConsumerGroupPage key={groupId} gateway={gateway} groupId={groupId} listConsumerGroups={listConsumerGroups} offsetReset={offsetReset} />
      ) : view === "consumer-groups" ? (
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
