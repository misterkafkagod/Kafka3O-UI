import type { TopicMessage } from "../gateway/types";
import { exactMessageOffset } from "./exactMessageOffset";

export type MessageLinkContext = {
  origin: string;
  gatewayId: string;
  topicName: string;
  copyText: (text: string) => Promise<void>;
};

export function messageLink(context: MessageLinkContext, message: TopicMessage): string | undefined {
  const offset = exactMessageOffset(message);
  if (offset === undefined || !Number.isInteger(message.partition) || message.partition < 0 || message.partition > 2147483647) {
    return undefined;
  }
  const query = new URLSearchParams({ partition: String(message.partition), offset });
  return `${context.origin.replace(/\/+$/, "")}/clusters/${encodeURIComponent(context.gatewayId)}/topics/${encodeURIComponent(context.topicName)}/messages?${query}`;
}
