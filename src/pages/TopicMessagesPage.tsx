import { Link } from "react-router";
import { ErrorWithRetry } from "../components/ErrorWithRetry";
import { MessageTable } from "../components/MessageTable";
import { TopicTabs } from "../components/TopicTabs";
import type { ListLatestTopicMessages } from "../gateway/listLatestTopicMessages";
import type { GatewayEntry } from "../gateway/types";
import { useLatestTopicMessages } from "../hooks/useLatestTopicMessages";

type TopicMessagesPageProps = {
  gateway: GatewayEntry;
  topicName: string;
  listLatestTopicMessages: ListLatestTopicMessages;
};

export function TopicMessagesPage({ gateway, topicName, listLatestTopicMessages }: TopicMessagesPageProps) {
  const { data: messages, isError, error, refetch } = useLatestTopicMessages(gateway, topicName, listLatestTopicMessages);

  if (isError) {
    return <ErrorWithRetry error={error} onRetry={() => void refetch()} />;
  }
  if (messages === undefined) {
    return <p>Loading messages…</p>;
  }
  return (
    <main>
      <Link to={`/clusters/${gateway.id}/topics`}>Back to topics</Link>
      <TopicTabs gateway={gateway} topicName={topicName} />
      <h2>{topicName}</h2>
      <h3>Messages</h3>
      {messages.length === 0 ? <p>No messages found.</p> : <MessageTable messages={messages} />}
    </main>
  );
}
