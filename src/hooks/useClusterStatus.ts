import { useQuery } from "@tanstack/react-query";
import type { GetCluster } from "../gateway/getCluster";
import type { GatewayEntry } from "../gateway/types";

export function useClusterStatus(gateway: GatewayEntry, getCluster: GetCluster) {
  return useQuery({
    queryKey: ["gateway", gateway.id, "cluster"],
    queryFn: () => getCluster(gateway.url),
  });
}
