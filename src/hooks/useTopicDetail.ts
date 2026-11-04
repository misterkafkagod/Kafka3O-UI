import { useQuery } from "@tanstack/react-query";
import type { GetTopicDetail } from "../gateway/getTopicDetail";
import type { GatewayEntry } from "../gateway/types";

export function useTopicDetail(gateway: GatewayEntry, topicName: string, getTopicDetail: GetTopicDetail) {
  return useQuery({
    queryKey: ["gateway", gateway.id, "topic", topicName],
    queryFn: () => getTopicDetail(gateway.url, topicName),
    retry: false,
  });
}
