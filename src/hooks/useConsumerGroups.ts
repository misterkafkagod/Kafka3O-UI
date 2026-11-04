import { useQuery } from "@tanstack/react-query";
import type { ListConsumerGroups } from "../gateway/listConsumerGroups";
import type { GatewayEntry } from "../gateway/types";

export function useConsumerGroups(gateway: GatewayEntry, listConsumerGroups: ListConsumerGroups) {
  return useQuery({
    queryKey: ["gateway", gateway.id, "consumer-groups"],
    queryFn: () => listConsumerGroups(gateway.url),
    retry: false,
  });
}
