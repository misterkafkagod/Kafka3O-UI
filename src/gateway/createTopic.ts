import type { FetchGatewayWrite } from "./GatewayWriteRequest";

export type CreateTopicInput = {
  name: string;
  partitions: number;
  replicationFactor: number;
};

export type CreateTopic = (gatewayUrl: string, input: CreateTopicInput) => Promise<void>;

export async function createTopic(fetchWrite: FetchGatewayWrite, gatewayUrl: string, input: CreateTopicInput): Promise<void> {
  const result = await fetchWrite(`${gatewayUrl.replace(/\/+$/, "")}/api/v1/topics`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (typeof result !== "object" || result === null || !("name" in result) || !("partitions" in result) ||
      !("replicationFactor" in result) || result.name !== input.name || result.partitions !== input.partitions ||
      result.replicationFactor !== input.replicationFactor) {
    throw new Error("The gateway returned an invalid topic creation response.");
  }
}
