import { fetchJson } from "./fetchJson";
import type { GatewayWriteRequest } from "./GatewayWriteRequest";
import { isValidGatewayToken } from "./isValidGatewayToken";
import { isLocalManualGatewayUrl, localManualProxyHeader } from "./isLocalManualGatewayUrl";
import { secureGatewayUrl } from "./secureGatewayUrl";

export async function fetchGatewayJson(
  fetchFn: typeof fetch,
  gatewayUrl: string,
  requestUrl: string,
  timeoutMs: number,
  readToken: (gatewayUrl: string) => string | null,
  secureContext: boolean,
  request?: GatewayWriteRequest,
  manualProxyOrigin?: string,
): Promise<unknown> {
  if (!secureContext) {
    throw new Error("The UI must use HTTPS or a trusted loopback origin before accessing a gateway.");
  }
  const localProxy = isLocalManualGatewayUrl(gatewayUrl, manualProxyOrigin);
  const base = new URL(localProxy ? gatewayUrl : secureGatewayUrl(gatewayUrl));
  const target = new URL(requestUrl);
  const prefix = base.pathname.replace(/\/+$/, "");
  if (target.origin !== base.origin || target.username || target.password || target.hash ||
      (prefix !== "" && target.pathname !== prefix && !target.pathname.startsWith(`${prefix}/`))) {
    throw new Error("Gateway request URL is outside the configured gateway.");
  }
  const headers = new Headers();
  if (localProxy) {
    headers.set(localManualProxyHeader, "1");
  } else {
    const token = readToken(gatewayUrl);
    if (token !== null && !isValidGatewayToken(token)) {
      throw new Error("Stored gateway token has an invalid format; replace it.");
    }
    if (token !== null) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }
  if (request?.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  return fetchJson(fetchFn, target.href, timeoutMs, {
    method: request?.method, body: request?.body,
    headers, redirect: "error", cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer",
  });
}
