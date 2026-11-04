import type { TopicMessage } from "../gateway/types";
import { exactMessageOffset } from "./exactMessageOffset";
import type { TopicMessageLinkPosition } from "./topicMessageLinkPosition";

export type LinkedTopicMessageResult =
  | { kind: "found"; message: TopicMessage }
  | { kind: "unverifiable" }
  | { kind: "not-found" };

export function findLinkedTopicMessage(messages: TopicMessage[], position: TopicMessageLinkPosition): LinkedTopicMessageResult {
  let unverifiable = false;
  for (const message of messages) {
    if (message.partition !== position.partition) {
      continue;
    }
    const offset = exactMessageOffset(message);
    if (offset === position.offset) {
      return { kind: "found", message };
    }
    if (offset === undefined) {
      unverifiable = true;
    }
  }
  return { kind: unverifiable ? "unverifiable" : "not-found" };
}
