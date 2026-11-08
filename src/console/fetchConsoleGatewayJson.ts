import { HttpError } from "../gateway/HttpError";
import type { GatewayWriteRequest } from "../gateway/GatewayWriteRequest";
import { isRecord } from "../gateway/isRecord";
import { readConsoleCsrf } from "./readConsoleCsrf";

// fetchConsoleGatewayJson sends a Gateway request same-origin through the Console, which authenticates the session,
// mints a delegation and forwards it. Writes carry the CSRF header; no token or Gateway address leaves the browser.
// A 401 means the Console session ended: onUnauthorized runs before the error is thrown.
export async function fetchConsoleGatewayJson(
  fetchFn: typeof fetch,
  origin: string,
  readCookies: () => string,
  gatewayUrl: string,
  requestUrl: string,
  timeoutMs: number,
  onUnauthorized: () => void,
  request?: GatewayWriteRequest,
): Promise<unknown> {
  const base = new URL(gatewayUrl);
  const target = new URL(requestUrl);
  if (base.origin !== origin || target.origin !== origin || target.username || target.password || target.hash ||
      !/^\/api\/clusters\/[^/]+\/gateway$/.test(base.pathname) || !target.pathname.startsWith(`${base.pathname}/api/v1/`)) {
    throw new Error("Gateway request URL is outside the Console forwarding API.");
  }
  const headers = new Headers({ Accept: "application/json" });
  const method = request?.method ?? "GET";
  if (method !== "GET") {
    headers.set("X-Kafka3O-CSRF", readConsoleCsrf(readCookies()));
  }
  if (request?.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetchFn(target.href, {
    method, body: request?.body, headers, credentials: "same-origin", mode: "same-origin",
    redirect: "error", cache: "no-store", referrerPolicy: "no-referrer", signal: AbortSignal.timeout(timeoutMs),
  });
  if (response.ok) {
    return response.json();
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }
  const code = isRecord(body) && typeof body.code === "string" ? body.code : undefined;
  const title = isRecord(body) && typeof body.title === "string" ? body.title : undefined;
  const detail = isRecord(body) && typeof body.detail === "string" ? body.detail : title;
  if (response.status === 401) {
    onUnauthorized();
  }
  throw new HttpError(response.status, `${method} ${target.pathname} failed with ${response.status}`, { code, detail });
}
