import type { Topic } from "../gateway/types";

export type TopicFilter = {
  showInternal: boolean;
};

export function filterTopics(topics: Topic[], { showInternal }: TopicFilter): Topic[] {
  return topics.filter((topic) => showInternal || !topic.internal);
}
