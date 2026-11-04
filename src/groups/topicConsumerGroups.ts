import type { ConsumerGroup } from "../gateway/types";

export type TopicConsumerGroupsResult = {
  associated: ConsumerGroup[];
  unresolved: ConsumerGroup[];
};

export function topicConsumerGroups(groups: ConsumerGroup[], topicName: string): TopicConsumerGroupsResult {
  const associated: ConsumerGroup[] = [];
  const unresolved: ConsumerGroup[] = [];
  for (const group of groups) {
    if (group.topics.includes(topicName)) {
      associated.push({ ...group, partitions: group.partitions.filter((partition) => partition.topic === topicName) });
    } else if (group.error) {
      unresolved.push(group);
    }
  }
  return { associated, unresolved };
}
