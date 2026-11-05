import { secureGatewayUrl } from "./secureGatewayUrl";

export function gatewayTokenKey(gatewayUrl: string): string {
  return `kafka3o:gateway-token:${secureGatewayUrl(gatewayUrl)}`;
}
