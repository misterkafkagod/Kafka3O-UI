import { useId, useState } from "react";
import type { SearchTopicMessages as SearchTopicMessagesAction } from "../gateway/searchTopicMessages";
import type { GatewayEntry } from "../gateway/types";
import { useSearchTopicMessages } from "../hooks/useSearchTopicMessages";
import { messageSearchSubmission } from "../messages/messageSearchSubmission";
import type { MessageLinkContext } from "../messages/messageLink";
import { ErrorWithRetry } from "./ErrorWithRetry";
import { MessageWorkspace } from "./MessageWorkspace";
import styles from "./SearchTopicMessages.module.css";

type SearchTopicMessagesProps = {
  gateway: GatewayEntry;
  topicName: string;
  searchTopicMessages: SearchTopicMessagesAction;
  messageLinks?: MessageLinkContext;
};

export function SearchTopicMessages({ gateway, topicName, searchTopicMessages, messageLinks }: SearchTopicMessagesProps) {
  const boundsId = useId();
  const [text, setText] = useState("");
  const [query, setQuery] = useState<string>();
  const [validationError, setValidationError] = useState(false);
  const { data, isError, error, isFetching, refetch } = useSearchTopicMessages(gateway, topicName, searchTopicMessages, query);

  return (
    <section aria-label="Message search" className={styles.search}>
      <div className={styles.controls}>
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
            <input type="search" value={text} aria-describedby={boundsId} onChange={(event) => setText(event.target.value)} />
          </label>
          <button type="submit">Search</button>
        </form>
        <p id={boundsId} className={styles.bounds}>
          Search is case-sensitive and scans at most 500 recent offset positions across this topic. Offset gaps may
          reduce the records examined; these are not necessarily the newest 500 by timestamp.
        </p>
        {validationError ? <p role="alert">Enter search text.</p> : null}
      </div>
      {query === undefined ? null : isError ? (
        <ErrorWithRetry error={error} gateway={gateway} onRetry={() => void refetch()} />
      ) : isFetching || data === undefined ? (
        <p role="status">Searching messages…</p>
      ) : (
        <>
          <section aria-label="Search summary" className={styles.summary}>
            <h4>Search summary</h4>
            <p>Examined {data.scanned} records (limit: 500 offset positions).</p>
            <p>
              {data.truncated
                ? "Older offsets or partitions were excluded from this search."
                : "No available offsets were excluded from this search."}
            </p>
          </section>
          {data.messages.length === 0 ? <p>No matching messages.</p> : <MessageWorkspace messages={data.messages} messageLinks={messageLinks} />}
        </>
      )}
    </section>
  );
}
