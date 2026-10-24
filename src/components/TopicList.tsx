import { useState } from "react";
import type { ListTopics } from "../gateway/listTopics";
import type { GatewayEntry } from "../gateway/types";
import { useTopics } from "../hooks/useTopics";
import { compareTopicsByName } from "../topics/compareTopicsByName";
import { filterTopics } from "../topics/filterTopics";
import { TopicTable } from "./TopicTable";

type TopicListProps = {
  gateway: GatewayEntry;
  listTopics: ListTopics;
};

export function TopicList({ gateway, listTopics }: TopicListProps) {
  const { data: topics, isError } = useTopics(gateway, listTopics);
  const [showInternal, setShowInternal] = useState(false);

  // Error is checked before data: React Query keeps the last data after a failed refetch.
  if (isError) {
    return <p>Topics unavailable</p>;
  }
  if (topics === undefined) {
    return <p>Loading topics…</p>;
  }
  const visible = filterTopics(topics, { showInternal }).sort(compareTopicsByName);

  return (
    <>
      <label>
        <input type="checkbox" checked={showInternal} onChange={(event) => setShowInternal(event.target.checked)} /> Show
        internal
      </label>
      {visible.length === 0 ? <p>No topics</p> : <TopicTable topics={visible} />}
    </>
  );
}
