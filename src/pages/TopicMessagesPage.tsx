import { useState } from "react";
import { Link } from "react-router";
import { ErrorWithRetry } from "../components/ErrorWithRetry";
import { MessageTable } from "../components/MessageTable";
import { ReadTopicMessagesForm } from "../components/ReadTopicMessagesForm";
import { SearchTopicMessages } from "../components/SearchTopicMessages";
import { TopicTabs } from "../components/TopicTabs";
import type { ListLatestTopicMessages } from "../gateway/listLatestTopicMessages";
import type { SearchTopicMessages as SearchTopicMessagesAction } from "../gateway/searchTopicMessages";
import type { GatewayEntry, TopicMessagePosition } from "../gateway/types";
import { useLatestTopicMessages } from "../hooks/useLatestTopicMessages";

type TopicMessagesPageProps = {
  gateway: GatewayEntry;
  topicName: string;
  listLatestTopicMessages: ListLatestTopicMessages;
  searchTopicMessages: SearchTopicMessagesAction;
};

export function TopicMessagesPage({ gateway, topicName, listLatestTopicMessages, searchTopicMessages }: TopicMessagesPageProps) {
  const [position, setPosition] = useState<TopicMessagePosition>();
  const [searching, setSearching] = useState(false);
  const { data: messages, isError, error, refetch } = useLatestTopicMessages(
    gateway,
    topicName,
    listLatestTopicMessages,
    position,
  );
  return (
    <main>
      <Link to={`/clusters/${gateway.id}/topics`}>Back to topics</Link>
      <TopicTabs gateway={gateway} topicName={topicName} />
      <h2>{topicName}</h2>
      <h3>Messages</h3>
      <button type="button" onClick={() => setSearching((current) => !current)}>
        {searching ? "Back to message reads" : "Search messages"}
      </button>
      {searching ? (
        <SearchTopicMessages gateway={gateway} topicName={topicName} searchTopicMessages={searchTopicMessages} />
      ) : (
        <>
          <ReadTopicMessagesForm onRead={setPosition} onReadLatest={() => setPosition(undefined)} />
          {isError ? (
            <ErrorWithRetry error={error} onRetry={() => void refetch()} />
          ) : messages === undefined ? (
            <p>Loading messages…</p>
          ) : messages.length === 0 ? (
            <p>No messages found.</p>
          ) : (
            <MessageTable messages={messages} />
          )}
        </>
      )}
    </main>
  );
}
