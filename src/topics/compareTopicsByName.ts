import type { Topic } from "../gateway/types";

export function compareTopicsByName(a: Topic, b: Topic): number {
  return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
}
