import { gatewayTokenKey } from "./gatewayTokenKey";

export function getGatewayToken(storage: Pick<Storage, "getItem">, gatewayUrl: string): string | null {
  return storage.getItem(gatewayTokenKey(gatewayUrl));
}
