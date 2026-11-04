import { skipToken, useQuery } from "@tanstack/react-query";
import type { SearchTopicMessages } from "../gateway/searchTopicMessages";
import type { GatewayEntry } from "../gateway/types";

export function useSearchTopicMessages(
  gateway: GatewayEntry,
  topicName: string,
  searchTopicMessages: SearchTopicMessages,
  query?: string,
) {
  return useQuery({
    queryKey: ["gateway", gateway.id, "topic", topicName, "message-search", query],
    queryFn: query === undefined ? skipToken : () => searchTopicMessages(gateway.url, topicName, query),
    retry: false,
  });
}
