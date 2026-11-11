import { Link, useParams } from "react-router";
import { ClusterNotFound } from "../components/ClusterNotFound";
import { GatewayConfigError } from "../components/GatewayConfigError";
import { TopicBackup } from "../components/TopicBackup";
import { TopicTabs } from "../components/TopicTabs";
import { findGatewayById } from "../config/findGatewayById";
import type { LoadGatewayConfig } from "../config/loadGatewayConfig";
import type { ListBackups } from "../gateway/listBackups";
import { useGatewayConfig } from "../hooks/useGatewayConfig";

type Props = {
  loadGatewayConfig: LoadGatewayConfig;
  listBackups?: ListBackups;
};

export function TopicBackupPage({ loadGatewayConfig, listBackups }: Props) {
  const { gatewayId, topicName } = useParams();
  const { data: gateways, isError, refetch } = useGatewayConfig(loadGatewayConfig);
  if (isError) return <GatewayConfigError onRetry={() => void refetch()} />;
  if (!gateways) return <main><p role="status">Loading…</p></main>;
  const gateway = findGatewayById(gateways, gatewayId);
  if (!gateway) return <ClusterNotFound gatewayId={gatewayId} />;
  if (topicName === undefined) return <main><h2>Topic not found</h2><Link to={`/clusters/${encodeURIComponent(gateway.id)}/topics`}>Back to topics</Link></main>;
  return (
    <main>
      <Link to={`/clusters/${encodeURIComponent(gateway.id)}/topics`}>Back to topics</Link>
      <TopicTabs gateway={gateway} topicName={topicName} />
      <h2>{topicName}</h2>
      {listBackups ? <TopicBackup gateway={gateway} topicName={topicName} listBackups={listBackups} />
        : <p role="status">Backups are not available in this console.</p>}
    </main>
  );
}
