import { Link, useParams } from "react-router";
import { ClusterNotFound } from "../components/ClusterNotFound";
import { findGatewayById } from "../config/findGatewayById";
import type { LoadGatewayConfig } from "../config/loadGatewayConfig";
import type { GetTopicDetail } from "../gateway/getTopicDetail";
import type { ListLatestTopicMessages } from "../gateway/listLatestTopicMessages";
import type { SearchTopicMessages } from "../gateway/searchTopicMessages";
import { useGatewayConfig } from "../hooks/useGatewayConfig";
import { TopicDetailPage } from "./TopicDetailPage";
import { TopicMessagesPage } from "./TopicMessagesPage";

type TopicPageProps = {
  loadGatewayConfig: LoadGatewayConfig;
  getTopicDetail: GetTopicDetail;
  listLatestTopicMessages: ListLatestTopicMessages;
  searchTopicMessages: SearchTopicMessages;
  view?: "details" | "messages";
};

export function TopicPage({ loadGatewayConfig, getTopicDetail, listLatestTopicMessages, searchTopicMessages, view = "details" }: TopicPageProps) {
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
  if (view === "messages") {
    return <TopicMessagesPage gateway={gateway} topicName={topicName} listLatestTopicMessages={listLatestTopicMessages} searchTopicMessages={searchTopicMessages} />;
  }
  return <TopicDetailPage gateway={gateway} topicName={topicName} getTopicDetail={getTopicDetail} />;
}
