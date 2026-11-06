import { useState } from "react";
import type { SearchTopicMessages as SearchTopicMessagesAction } from "../gateway/searchTopicMessages";
import type { GatewayEntry } from "../gateway/types";
import { useSearchTopicMessages } from "../hooks/useSearchTopicMessages";
import { messageSearchSubmission } from "../messages/messageSearchSubmission";
import type { MessageLinkContext } from "../messages/messageLink";
import { ErrorWithRetry } from "./ErrorWithRetry";
import { MessageTable } from "./MessageTable";

type SearchTopicMessagesProps = {
  gateway: GatewayEntry;
  topicName: string;
  searchTopicMessages: SearchTopicMessagesAction;
  messageLinks?: MessageLinkContext;
};

export function SearchTopicMessages({ gateway, topicName, searchTopicMessages, messageLinks }: SearchTopicMessagesProps) {
  const [text, setText] = useState("");
  const [query, setQuery] = useState<string>();
  const [validationError, setValidationError] = useState(false);
  const { data, isError, error, isFetching, refetch } = useSearchTopicMessages(gateway, topicName, searchTopicMessages, query);

  return (
    <section aria-label="Message search">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const submission = messageSearchSubmission(text, query);
          setValidationError(submission.invalid);
          setQuery(submission.query);
          if (submission.repeat) {
            void refetch();
          }
        }}
      >
        <label>
          Search key or value
          <input type="search" value={text} onChange={(event) => setText(event.target.value)} />
        </label>
        <button type="submit">Search</button>
      </form>
      <p>
        Search is case-sensitive and scans at most 500 recent offset positions across this topic. Offset gaps may
        reduce the records examined; these are not necessarily the newest 500 by timestamp.
      </p>
      {validationError ? <p role="alert">Enter search text.</p> : null}
      {query === undefined ? null : isError ? (
        <ErrorWithRetry error={error} onRetry={() => void refetch()} />
      ) : isFetching || data === undefined ? (
        <p role="status">Searching messages…</p>
      ) : (
        <>
          <p>Examined {data.scanned} records (limit: 500 offset positions).</p>
          <p>
            {data.truncated
              ? "Older offsets or partitions were excluded from this search."
              : "No available offsets were excluded from this search."}
          </p>
          {data.messages.length === 0 ? <p>No matching messages.</p> : <MessageTable messages={data.messages} messageLinks={messageLinks} />}
        </>
      )}
    </section>
  );
}
