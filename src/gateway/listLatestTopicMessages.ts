import type { FetchJson } from "./fetchJson";
import type { TopicMessage } from "./types";

export type ListLatestTopicMessages = (gatewayUrl: string, topicName: string) => Promise<TopicMessage[]>;

export async function listLatestTopicMessages(
  fetchJson: FetchJson,
  gatewayUrl: string,
  topicName: string,
): Promise<TopicMessage[]> {
  const url = `${gatewayUrl.replace(/\/+$/, "")}/api/v1/topics/${encodeURIComponent(topicName)}/messages`;
  return (await fetchJson(url)) as TopicMessage[];
}
