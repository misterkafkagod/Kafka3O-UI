import { useQuery } from "@tanstack/react-query";
import type { ListBackups } from "../gateway/listBackups";
import type { GatewayEntry } from "../gateway/types";

export function useBackups(gateway: GatewayEntry, listBackups: ListBackups) {
  return useQuery({
    queryKey: ["gateway", gateway.id, "backups"],
    queryFn: () => listBackups(gateway.url),
    retry: false,
    // A running restore is followed every 5 seconds; each read also lets the Gateway finish a completed restore.
    refetchInterval: (query) => (query.state.data?.some((backup) => backup.restore && !backup.restore.finished) ? 5000 : false),
  });
}
