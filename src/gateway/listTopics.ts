import type { FetchJson } from "./fetchJson";
import type { Topic } from "./types";

export type ListTopics = (gatewayUrl: string) => Promise<Topic[]>;

export async function listTopics(fetchJson: FetchJson, gatewayUrl: string): Promise<Topic[]> {
  return (await fetchJson(`${gatewayUrl.replace(/\/+$/, "")}/api/v1/topics`)) as Topic[];
}
