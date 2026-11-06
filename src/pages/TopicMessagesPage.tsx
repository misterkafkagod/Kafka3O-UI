import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { ErrorWithRetry } from "../components/ErrorWithRetry";
import { MessageWorkspace } from "../components/MessageWorkspace";
import { LinkedTopicMessage } from "../components/LinkedTopicMessage";
import { ProduceTopicMessage } from "../components/ProduceTopicMessage";
import { ReadTopicMessagesForm } from "../components/ReadTopicMessagesForm";
import { SearchTopicMessages } from "../components/SearchTopicMessages";
import { TopicTabs } from "../components/TopicTabs";
import type { ListLatestTopicMessages } from "../gateway/listLatestTopicMessages";
import type { ProduceTopicMessage as ProduceAction } from "../gateway/produceTopicMessage";
import type { SearchTopicMessages as SearchTopicMessagesAction } from "../gateway/searchTopicMessages";
import type { GatewayEntry, TopicMessagePosition } from "../gateway/types";
import { useLatestTopicMessages } from "../hooks/useLatestTopicMessages";
import type { MessageLinkContext } from "../messages/messageLink";
import { topicMessageLinkPosition } from "../messages/topicMessageLinkPosition";
import styles from "./TopicMessagesPage.module.css";

type TopicMessagesPageProps = {
  gateway: GatewayEntry;
  topicName: string;
  listLatestTopicMessages: ListLatestTopicMessages;
  searchTopicMessages: SearchTopicMessagesAction;
  produceTopicMessage: ProduceAction;
  messageLinks: MessageLinkContext;
};

export function TopicMessagesPage({ gateway, topicName, listLatestTopicMessages, searchTopicMessages, produceTopicMessage, messageLinks }: TopicMessagesPageProps) {
  const [position, setPosition] = useState<TopicMessagePosition>();
  const [searching, setSearching] = useState(false);
  const [params] = useSearchParams();
  const linkPosition = topicMessageLinkPosition(params);
  const requestPosition = linkPosition.kind === "position" ? linkPosition.position : position;
  const { data: messages, isError, error, isFetching, refetch } = useLatestTopicMessages(
    gateway,
    topicName,
    listLatestTopicMessages,
    requestPosition,
    linkPosition.kind !== "invalid",
  );
  return (
    <main>
      <Link to={`/clusters/${encodeURIComponent(gateway.id)}/topics`}>Back to topics</Link>
      <TopicTabs gateway={gateway} topicName={topicName} />
      <header className={styles.heading}>
        <div>
          <h2>{topicName}</h2>
          <p>Read and inspect messages for this topic.</p>
        </div>
        <details className={styles.produce}>
          <summary>Produce message</summary>
          <ProduceTopicMessage key={JSON.stringify([gateway.id, topicName])} gateway={gateway} topicName={topicName} produceTopicMessage={produceTopicMessage} />
        </details>
      </header>
      <h3>Messages</h3>
      {linkPosition.kind !== "none" ? (
        <>
          <Link to={`/clusters/${encodeURIComponent(gateway.id)}/topics/${encodeURIComponent(topicName)}/messages`}>Back to message reads</Link>
          {linkPosition.kind === "invalid" ? (
            <p role="alert">Invalid message link.</p>
          ) : (
            <LinkedTopicMessage
              position={linkPosition.position}
              gateway={gateway}
              messages={messages}
              isError={isError}
              error={error}
              isFetching={isFetching}
              onRetry={() => void refetch()}
              messageLinks={messageLinks}
            />
          )}
        </>
      ) : (
        <>
          <div className={styles.mode}>
            <p>{searching ? "Search recent messages by key or value." : "Read the latest messages or choose a starting position."}</p>
            <button type="button" onClick={() => setSearching((current) => !current)}>
              {searching ? "Back to message reads" : "Search messages"}
            </button>
          </div>
          {searching ? (
            <SearchTopicMessages gateway={gateway} topicName={topicName} searchTopicMessages={searchTopicMessages} messageLinks={messageLinks} />
          ) : (
            <>
              <section aria-label="Message read controls" className={styles.readControls}>
                <ReadTopicMessagesForm onRead={setPosition} onReadLatest={() => setPosition(undefined)} />
              </section>
              {isError ? (
                <ErrorWithRetry error={error} gateway={gateway} onRetry={() => void refetch()} />
              ) : messages === undefined ? (
                <p role="status">Loading messages…</p>
              ) : messages.length === 0 ? (
                <p>No messages found.</p>
              ) : (
                <MessageWorkspace messages={messages} messageLinks={messageLinks} />
              )}
            </>
          )}
        </>
      )}
    </main>
  );
}
