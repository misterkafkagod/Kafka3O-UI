import { gatewayTokenKey } from "./gatewayTokenKey";

export function clearGatewayToken(storage: Pick<Storage, "removeItem">, gatewayUrl: string): void {
  storage.removeItem(gatewayTokenKey(gatewayUrl));
}
