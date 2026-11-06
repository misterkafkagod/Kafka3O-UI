import { useState } from "react";
import type { ListTopics } from "../gateway/listTopics";
import type { GatewayEntry } from "../gateway/types";
import { useTopics } from "../hooks/useTopics";
import { compareTopicsByName } from "../topics/compareTopicsByName";
import { filterTopics } from "../topics/filterTopics";
import { ErrorWithRetry } from "./ErrorWithRetry";
import styles from "./TopicList.module.css";
import { TopicTable } from "./TopicTable";

type TopicListProps = {
  gateway: GatewayEntry;
  listTopics: ListTopics;
};

export function TopicList({ gateway, listTopics }: TopicListProps) {
  const { data: topics, isError, error, refetch } = useTopics(gateway, listTopics);
  const [showInternal, setShowInternal] = useState(false);
  const [text, setText] = useState("");

  // Error is checked before data: React Query keeps the last data after a failed refetch.
  if (isError) {
    return <ErrorWithRetry error={error} gateway={gateway} onRetry={() => void refetch()} />;
  }
  if (topics === undefined) {
    return <p role="status">Loading topics…</p>;
  }
  const available = filterTopics(topics, { showInternal, text: "" });
  const visible = filterTopics(topics, { showInternal, text }).sort(compareTopicsByName);

  return (
    <>
      <section aria-label="Topic filters" className={styles.filters}>
        <label className={styles.search}>
          Filter topics <input type="search" value={text} onChange={(event) => setText(event.target.value)} />
        </label>
        <label className={styles.internal}>
          <input type="checkbox" checked={showInternal} onChange={(event) => setShowInternal(event.target.checked)} /> Show
          internal
        </label>
      </section>
      <p className={styles.count} role="status">
        Showing {visible.length} of {available.length} {available.length === 1 ? "topic" : "topics"}
      </p>
      {available.length === 0 ? (
        <p>No topics</p>
      ) : visible.length === 0 ? (
        <p>No topics match "{text}"</p>
      ) : (
        <TopicTable gatewayId={gateway.id} topics={visible} />
      )}
    </>
  );
}
