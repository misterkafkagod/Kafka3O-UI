import type { ListTopics } from "../gateway/listTopics";
import type { GatewayEntry } from "../gateway/types";
import { useTopics } from "../hooks/useTopics";
import { compareTopicsByName } from "../topics/compareTopicsByName";
import { TopicTable } from "./TopicTable";

type TopicListProps = {
  gateway: GatewayEntry;
  listTopics: ListTopics;
};

export function TopicList({ gateway, listTopics }: TopicListProps) {
  const { data: topics, isError } = useTopics(gateway, listTopics);

  // Error is checked before data: React Query keeps the last data after a failed refetch.
  if (isError) {
    return <p>Topics unavailable</p>;
  }
  if (topics === undefined) {
    return <p>Loading topics…</p>;
  }
  return <TopicTable topics={[...topics].sort(compareTopicsByName)} />;
}
