import { useState } from "react";
import type { ListTopics } from "../gateway/listTopics";
import type { GatewayEntry } from "../gateway/types";
import { useTopics } from "../hooks/useTopics";
import { compareTopicsByName } from "../topics/compareTopicsByName";
import { filterTopics } from "../topics/filterTopics";
import { ErrorWithRetry } from "./ErrorWithRetry";
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
    return <ErrorWithRetry error={error} onRetry={() => void refetch()} />;
  }
  if (topics === undefined) {
    return <p>Loading topics…</p>;
  }
  const available = filterTopics(topics, { showInternal, text: "" });
  const visible = filterTopics(topics, { showInternal, text }).sort(compareTopicsByName);

  return (
    <>
      <label>
        Filter topics <input type="search" value={text} onChange={(event) => setText(event.target.value)} />
      </label>{" "}
      <label>
        <input type="checkbox" checked={showInternal} onChange={(event) => setShowInternal(event.target.checked)} /> Show
        internal
      </label>
      {available.length === 0 ? (
        <p>No topics</p>
      ) : visible.length === 0 ? (
        <p>No topics match "{text}"</p>
      ) : (
        <TopicTable topics={visible} />
      )}
    </>
  );
}
