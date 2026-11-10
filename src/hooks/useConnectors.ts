import { useQuery } from "@tanstack/react-query";
import type { ListConnectors } from "../gateway/listConnectors";
import type { GatewayEntry } from "../gateway/types";

export function useConnectors(gateway: GatewayEntry, listConnectors: ListConnectors) {
  return useQuery({
    queryKey: ["gateway", gateway.id, "connect", "connectors"],
    queryFn: () => listConnectors(gateway.url),
    retry: false,
  });
}
