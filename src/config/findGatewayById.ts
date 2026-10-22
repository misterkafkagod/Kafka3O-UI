import type { GatewayEntry } from "../gateway/types";

export function findGatewayById(gateways: GatewayEntry[], id: string | undefined): GatewayEntry | undefined {
  for (const gateway of gateways) {
    if (gateway.id === id) {
      return gateway;
    }
  }
  return undefined;
}
