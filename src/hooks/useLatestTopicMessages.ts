import { skipToken, useQuery } from "@tanstack/react-query";
import type { ListLatestTopicMessages } from "../gateway/listLatestTopicMessages";
import type { GatewayEntry, TopicMessagePosition } from "../gateway/types";

export function useLatestTopicMessages(
  gateway: GatewayEntry,
  topicName: string,
  listLatestTopicMessages: ListLatestTopicMessages,
  position?: TopicMessagePosition,
  enabled = true,
) {
  const queryKey =
    position === undefined
      ? ["gateway", gateway.id, "topic", topicName, "messages"]
      : ["gateway", gateway.id, "topic", topicName, "messages", "position", position];
  return useQuery({
    queryKey,
    queryFn: enabled
      ? () =>
          position === undefined
            ? listLatestTopicMessages(gateway.url, topicName)
            : listLatestTopicMessages(gateway.url, topicName, position)
      : skipToken,
    retry: false,
  });
}
