import { fetchJson } from "./fetchJson";
import { isValidGatewayToken } from "./isValidGatewayToken";
import { secureGatewayUrl } from "./secureGatewayUrl";

export async function fetchGatewayJson(
  fetchFn: typeof fetch,
  gatewayUrl: string,
  requestUrl: string,
  timeoutMs: number,
  readToken: (gatewayUrl: string) => string | null,
  secureContext: boolean,
): Promise<unknown> {
  if (!secureContext) {
    throw new Error("The UI must use HTTPS or a trusted loopback origin before accessing a gateway.");
  }
  const base = new URL(secureGatewayUrl(gatewayUrl));
  const target = new URL(requestUrl);
  const prefix = base.pathname.replace(/\/+$/, "");
  if (target.origin !== base.origin || target.username || target.password || target.hash ||
      (prefix !== "" && target.pathname !== prefix && !target.pathname.startsWith(`${prefix}/`))) {
    throw new Error("Gateway request URL is outside the configured gateway.");
  }
  const token = readToken(gatewayUrl);
  if (token !== null && !isValidGatewayToken(token)) {
    throw new Error("Stored gateway token has an invalid format; replace it.");
  }
  const headers = new Headers();
  if (token !== null) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetchJson(fetchFn, target.href, timeoutMs, {
    headers, redirect: "error", cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer",
  });
}
