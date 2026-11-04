import type { TopicMessagePosition } from "../gateway/types";

export type MessagePositionMode = "offset" | "timestamp";

export function topicMessagePositionFromForm(
  mode: MessagePositionMode,
  partition: string,
  offset: string,
  timestamp: string,
): TopicMessagePosition {
  if (mode === "offset") {
    return { partition: Number(partition), offset: Number(offset) };
  }
  return { partition: Number(partition), timestamp: Number(timestamp) };
}
