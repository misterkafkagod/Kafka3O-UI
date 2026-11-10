import { useQuery } from "@tanstack/react-query";
import type { GetMetrics } from "../gateway/getMetrics";
import type { GatewayEntry } from "../gateway/types";

// useMetrics refreshes the cluster's metrics every 10 seconds while the tab is open.
export function useMetrics(gateway: GatewayEntry, getMetrics: GetMetrics) {
  return useQuery({
    queryKey: ["gateway", gateway.id, "metrics"],
    queryFn: () => getMetrics(gateway.url),
    retry: false,
    refetchInterval: 10_000,
  });
}
