import { useQuery } from "@tanstack/react-query";
import type { LoadGatewayConfig } from "../config/loadGatewayConfig";

export function useGatewayConfig(load: LoadGatewayConfig) {
  return useQuery({ queryKey: ["config"], queryFn: load });
}
