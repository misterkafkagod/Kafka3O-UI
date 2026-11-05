import { topicMessageLinkPosition } from "../messages/topicMessageLinkPosition";
import type { FetchGatewayWrite } from "./GatewayWriteRequest";

export type ProduceMessageInput = {
  value: string;
  key?: string;
  headers: { key: string; value: string }[];
};

export type ProduceMessageResult = {
  partition: number;
  offset: string;
};

export type ProduceTopicMessage = (gatewayUrl: string, topic: string, message: ProduceMessageInput) => Promise<ProduceMessageResult>;

export async function produceTopicMessage(
  fetchWrite: FetchGatewayWrite,
  gatewayUrl: string,
  topic: string,
  message: ProduceMessageInput,
): Promise<ProduceMessageResult> {
  const result = await fetchWrite(`${gatewayUrl.replace(/\/+$/, "")}/api/v1/topics/${encodeURIComponent(topic)}/messages`, {
    method: "POST",
    body: JSON.stringify(message),
  });
  if (typeof result !== "object" || result === null || !("partition" in result) || !("offset" in result) ||
      typeof result.partition !== "number" || typeof result.offset !== "string" ||
      topicMessageLinkPosition(new URLSearchParams({ partition: String(result.partition), offset: result.offset })).kind !== "position") {
    throw new Error("The gateway returned an invalid message position.");
  }
  return { partition: result.partition, offset: result.offset };
}
