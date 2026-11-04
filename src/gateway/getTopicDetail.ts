import type { FetchJson } from "./fetchJson";
import type { TopicDetail } from "./types";

export type GetTopicDetail = (gatewayUrl: string, topicName: string) => Promise<TopicDetail>;

export async function getTopicDetail(fetchJson: FetchJson, gatewayUrl: string, topicName: string): Promise<TopicDetail> {
  const url = `${gatewayUrl.replace(/\/+$/, "")}/api/v1/topics/${encodeURIComponent(topicName)}`;
  return (await fetchJson(url)) as TopicDetail;
}
