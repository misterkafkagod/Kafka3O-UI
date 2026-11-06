import { Link, useParams } from "react-router";
import { ClusterNotFound } from "../components/ClusterNotFound";
import { GatewayConfigError } from "../components/GatewayConfigError";
import { TopicConsumerGroups } from "../components/TopicConsumerGroups";
import { findGatewayById } from "../config/findGatewayById";
import type { LoadGatewayConfig } from "../config/loadGatewayConfig";
import type { GetTopicDetail } from "../gateway/getTopicDetail";
import type { ConfirmTopicDeletion, DeleteTopic } from "../gateway/deleteTopic";
import type { ListConsumerGroups } from "../gateway/listConsumerGroups";
import type { ListLatestTopicMessages } from "../gateway/listLatestTopicMessages";
import type { ProduceTopicMessage } from "../gateway/produceTopicMessage";
import type { SearchTopicMessages } from "../gateway/searchTopicMessages";
import { useGatewayConfig } from "../hooks/useGatewayConfig";
import { TopicDetailPage } from "./TopicDetailPage";
import { TopicMessagesPage } from "./TopicMessagesPage";

type TopicPageProps = {
  loadGatewayConfig: LoadGatewayConfig;
  getTopicDetail: GetTopicDetail;
  listConsumerGroups: ListConsumerGroups;
  listLatestTopicMessages: ListLatestTopicMessages;
  searchTopicMessages: SearchTopicMessages;
  produceTopicMessage: ProduceTopicMessage;
  deleteTopic: DeleteTopic;
  confirmTopicDeletion: ConfirmTopicDeletion;
  linkOrigin: string;
  copyMessageLink: (text: string) => Promise<void>;
  view?: "details" | "messages" | "consumers";
};

export function TopicPage({ loadGatewayConfig, getTopicDetail, listConsumerGroups, listLatestTopicMessages, searchTopicMessages, produceTopicMessage, deleteTopic, confirmTopicDeletion, linkOrigin, copyMessageLink, view = "details" }: TopicPageProps) {
  const { gatewayId, topicName } = useParams();
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
  if (topicName === undefined) {
    return (
      <main>
        <h2>Topic not found</h2>
        <Link to={`/clusters/${encodeURIComponent(gateway.id)}/topics`}>Back to topics</Link>
      </main>
    );
  }
  if (view === "messages") {
    return <TopicMessagesPage gateway={gateway} topicName={topicName} listLatestTopicMessages={listLatestTopicMessages} searchTopicMessages={searchTopicMessages} produceTopicMessage={produceTopicMessage} messageLinks={{ origin: linkOrigin, gatewayId: gateway.id, topicName, copyText: copyMessageLink }} />;
  }
  if (view === "consumers") {
    return <TopicConsumerGroups gateway={gateway} topicName={topicName} listConsumerGroups={listConsumerGroups} />;
  }
  return <TopicDetailPage gateway={gateway} topicName={topicName} getTopicDetail={getTopicDetail} deleteTopic={deleteTopic} confirmTopicDeletion={confirmTopicDeletion} />;
}
