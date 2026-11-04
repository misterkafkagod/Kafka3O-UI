import { useQuery } from "@tanstack/react-query";
import type { ListLatestTopicMessages } from "../gateway/listLatestTopicMessages";
import type { GatewayEntry } from "../gateway/types";

export function useLatestTopicMessages(
  gateway: GatewayEntry,
  topicName: string,
  listLatestTopicMessages: ListLatestTopicMessages,
) {
  return useQuery({
    queryKey: ["gateway", gateway.id, "topic", topicName, "messages"],
    queryFn: () => listLatestTopicMessages(gateway.url, topicName),
    retry: false,
  });
}
