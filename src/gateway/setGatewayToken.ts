import { gatewayTokenKey } from "./gatewayTokenKey";
import { isValidGatewayToken } from "./isValidGatewayToken";

export function setGatewayToken(storage: Pick<Storage, "setItem">, gatewayUrl: string, token: string, secureContext: boolean): void {
  if (!secureContext) {
    throw new Error("The UI must use HTTPS or a trusted loopback origin before storing a token.");
  }
  if (!isValidGatewayToken(token)) {
    throw new Error("A token must contain at least 32 bearer-token characters.");
  }
  storage.setItem(gatewayTokenKey(gatewayUrl), token);
}
