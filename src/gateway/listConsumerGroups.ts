import type { FetchJson } from "./fetchJson";
import type { ConsumerGroup } from "./types";

export type ListConsumerGroups = (gatewayUrl: string) => Promise<ConsumerGroup[]>;

export async function listConsumerGroups(fetchJson: FetchJson, gatewayUrl: string): Promise<ConsumerGroup[]> {
  return (await fetchJson(`${gatewayUrl.replace(/\/+$/, "")}/api/v1/consumer-groups`)) as ConsumerGroup[];
}
