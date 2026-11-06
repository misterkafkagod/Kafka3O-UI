export const localManualProxyHeader = "X-Kafka3O-Manual";

export function isLocalManualGatewayUrl(gatewayUrl: string, enabledOrigin?: string): boolean {
  if (enabledOrigin !== "http://localhost:5173") return false;
  try {
    const url = new URL(gatewayUrl);
    return url.origin === enabledOrigin &&
      url.href === `${url.origin}${url.pathname}` &&
      (url.pathname === "/manual/gateways/a" || url.pathname === "/manual/gateways/b");
  } catch {
    return false;
  }
}
