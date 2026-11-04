import type { FetchJson } from "./fetchJson";
import type { TopicMessageSearchResult } from "./types";

export type SearchTopicMessages = (
  gatewayUrl: string,
  topicName: string,
  query: string,
) => Promise<TopicMessageSearchResult>;

export async function searchTopicMessages(
  fetchJson: FetchJson,
  gatewayUrl: string,
  topicName: string,
  query: string,
): Promise<TopicMessageSearchResult> {
  const search = new URLSearchParams({ query });
  const url = `${gatewayUrl.replace(/\/+$/, "")}/api/v1/topics/${encodeURIComponent(topicName)}/messages/search?${search}`;
  return (await fetchJson(url)) as TopicMessageSearchResult;
}
