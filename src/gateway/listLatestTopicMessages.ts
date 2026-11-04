import type { FetchJson } from "./fetchJson";
import type { TopicMessage, TopicMessagePosition } from "./types";

export type ListLatestTopicMessages = (
  gatewayUrl: string,
  topicName: string,
  position?: TopicMessagePosition,
) => Promise<TopicMessage[]>;

export async function listLatestTopicMessages(
  fetchJson: FetchJson,
  gatewayUrl: string,
  topicName: string,
  position?: TopicMessagePosition,
): Promise<TopicMessage[]> {
  let url = `${gatewayUrl.replace(/\/+$/, "")}/api/v1/topics/${encodeURIComponent(topicName)}/messages`;
  if (position !== undefined) {
    const query = new URLSearchParams({ partition: String(position.partition) });
    if ("offset" in position) {
      query.set("offset", String(position.offset));
    } else {
      query.set("timestamp", String(position.timestamp));
    }
    url += `?${query.toString()}`;
  }
  return (await fetchJson(url)) as TopicMessage[];
}
