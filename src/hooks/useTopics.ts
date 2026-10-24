import { useQuery } from "@tanstack/react-query";
import type { ListTopics } from "../gateway/listTopics";
import type { GatewayEntry } from "../gateway/types";

export function useTopics(gateway: GatewayEntry, listTopics: ListTopics) {
  return useQuery({
    queryKey: ["gateway", gateway.id, "topics"],
    queryFn: () => listTopics(gateway.url),
    // Errors show at once with a Retry button (P12) instead of being hidden behind automatic retries.
    retry: false,
  });
}
