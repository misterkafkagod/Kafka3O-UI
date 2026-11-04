import type { TopicMessage } from "../gateway/types";

const maxKafkaOffset = 9223372036854775807n;

export function exactMessageOffset(message: TopicMessage): string | undefined {
  if (message.offsetExact !== undefined) {
    if (typeof message.offsetExact !== "string" || message.offsetExact.length > 19 || !/^(0|[1-9]\d*)$/.test(message.offsetExact)) {
      return undefined;
    }
    const offset = BigInt(message.offsetExact);
    if (offset > maxKafkaOffset || Number(offset) !== message.offset) {
      return undefined;
    }
    return message.offsetExact;
  }
  if (!Number.isSafeInteger(message.offset) || message.offset < 0) {
    return undefined;
  }
  return String(message.offset);
}
