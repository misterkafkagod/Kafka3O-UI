import { Link, useParams } from "react-router";
import { ClusterNotFound } from "../components/ClusterNotFound";
import { ConfigurationEditor } from "../components/ConfigurationEditor";
import { ErrorWithRetry } from "../components/ErrorWithRetry";
import { GatewayConfigError } from "../components/GatewayConfigError";
import { PartitionManagement } from "../components/PartitionManagement";
import { TopicTabs } from "../components/TopicTabs";
import { findGatewayById } from "../config/findGatewayById";
import type { LoadGatewayConfig } from "../config/loadGatewayConfig";
import type { KafkaAdministration } from "../gateway/administration";
import type { GetCluster } from "../gateway/getCluster";
import type { GetTopicDetail } from "../gateway/getTopicDetail";
import type { GatewayEntry } from "../gateway/types";
import { useClusterStatus } from "../hooks/useClusterStatus";
import { useGatewayConfig } from "../hooks/useGatewayConfig";
import { useTopicDetail } from "../hooks/useTopicDetail";

type Props = {
  loadGatewayConfig: LoadGatewayConfig;
  getCluster: GetCluster;
  getTopicDetail: GetTopicDetail;
  administration: KafkaAdministration;
  statusRefreshMs: number;
};

function TopicAdministration({ gateway, topicName, getCluster, getTopicDetail, administration, statusRefreshMs }: Omit<Props, "loadGatewayConfig"> & { gateway: GatewayEntry; topicName: string }) {
  const topic = useTopicDetail(gateway, topicName, getTopicDetail);
  const cluster = useClusterStatus(gateway, getCluster, statusRefreshMs);
  return (
    <main>
      <Link to={`/clusters/${encodeURIComponent(gateway.id)}/topics`}>Back to topics</Link>
      <TopicTabs gateway={gateway} topicName={topicName} />
      <h2>Manage {topicName}</h2>
      <p>Changes affect this topic on {gateway.name}. Every change requires confirmation.</p>
      <nav aria-label="Topic administration sections">
        <a href="#configuration-editor-heading">Configuration</a>{" · "}
        <a href="#partition-management-heading">Partitions and replicas</a>
      </nav>
      <ConfigurationEditor key={JSON.stringify([gateway.id, topicName])} gateway={gateway} resource={{ kind: "topic", name: topicName }} administration={administration} />
      {topic.isError ? <ErrorWithRetry error={topic.error} gateway={gateway} onRetry={() => void topic.refetch()} /> : null}
      {cluster.isError ? <ErrorWithRetry error={cluster.error} gateway={gateway} onRetry={() => void cluster.refetch()} /> : null}
      {topic.isPending || cluster.isPending ? <p role="status">Loading partition and broker metadata…</p> : null}
      {topic.data && cluster.data ? (
        <PartitionManagement
          key={JSON.stringify([gateway.id, topicName])}
          gateway={gateway}
          detail={topic.data}
          brokers={cluster.data.brokers}
          administration={administration}
          refreshTopic={topic.refetch}
          refreshCluster={cluster.refetch}
          ready={!topic.isError && !cluster.isError}
        />
      ) : null}
    </main>
  );
}

export function TopicAdministrationPage({ loadGatewayConfig, getCluster, getTopicDetail, administration, statusRefreshMs }: Props) {
  const { gatewayId, topicName } = useParams();
  const { data: gateways, isError, refetch } = useGatewayConfig(loadGatewayConfig);
  if (isError) return <GatewayConfigError onRetry={() => void refetch()} />;
  if (!gateways) return <main><p role="status">Loading…</p></main>;
  const gateway = findGatewayById(gateways, gatewayId);
  if (!gateway) return <ClusterNotFound gatewayId={gatewayId} />;
  if (topicName === undefined) return <main><h2>Topic not found</h2><Link to={`/clusters/${encodeURIComponent(gateway.id)}/topics`}>Back to topics</Link></main>;
  return <TopicAdministration gateway={gateway} topicName={topicName} getCluster={getCluster} getTopicDetail={getTopicDetail} administration={administration} statusRefreshMs={statusRefreshMs} />;
}
