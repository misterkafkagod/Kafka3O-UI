import { useQuery } from "@tanstack/react-query";
import type { ListBackups } from "../gateway/listBackups";
import type { GatewayEntry } from "../gateway/types";

export function useBackups(gateway: GatewayEntry, listBackups: ListBackups) {
  return useQuery({
    queryKey: ["gateway", gateway.id, "backups"],
    queryFn: () => listBackups(gateway.url),
    retry: false,
  });
}
