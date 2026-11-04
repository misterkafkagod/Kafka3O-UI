import { Link, useParams } from "react-router";
import { ClusterNotFound } from "../components/ClusterNotFound";
import { findGatewayById } from "../config/findGatewayById";
import type { LoadGatewayConfig } from "../config/loadGatewayConfig";
import type { GetTopicDetail } from "../gateway/getTopicDetail";
import { useGatewayConfig } from "../hooks/useGatewayConfig";
import { TopicDetailPage } from "./TopicDetailPage";

type TopicPageProps = {
  loadGatewayConfig: LoadGatewayConfig;
  getTopicDetail: GetTopicDetail;
};

export function TopicPage({ loadGatewayConfig, getTopicDetail }: TopicPageProps) {
  const { gatewayId, topicName } = useParams();
  const { data: gateways } = useGatewayConfig(loadGatewayConfig);

  if (gateways === undefined) {
    return <p>Loading…</p>;
  }
  const gateway = findGatewayById(gateways, gatewayId);
  if (gateway === undefined) {
    return <ClusterNotFound gatewayId={gatewayId} />;
  }
  if (topicName === undefined) {
    return (
      <main>
        <h2>Topic not found</h2>
        <Link to={`/clusters/${gateway.id}/topics`}>Back to topics</Link>
      </main>
    );
  }
  return <TopicDetailPage gateway={gateway} topicName={topicName} getTopicDetail={getTopicDetail} />;
}
