import { useQuery } from "@tanstack/react-query";
import type { GetCluster } from "../gateway/getCluster";
import type { GatewayEntry } from "../gateway/types";

export function useClusterStatus(gateway: GatewayEntry, getCluster: GetCluster, refreshMs: number) {
  return useQuery({
    queryKey: ["gateway", gateway.id, "cluster"],
    queryFn: () => getCluster(gateway.url),
    // No automatic retries: 3 retries × 5 s timeout would hide an unreachable gateway for ~20 s.
    retry: false,
    refetchInterval: refreshMs,
  });
}
