import type { Topic } from "../gateway/types";

export type TopicFilter = {
  showInternal: boolean;
  text: string;
};

export function filterTopics(topics: Topic[], { showInternal, text }: TopicFilter): Topic[] {
  const needle = text.toLowerCase();
  return topics.filter((topic) => (showInternal || !topic.internal) && topic.name.toLowerCase().includes(needle));
}
