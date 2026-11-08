import { isRecord } from "../gateway/isRecord";
import type { ConsoleSsoRequest } from "./ConsoleSso";
import { ConsoleSessionError, type ConsoleSessionErrorCode } from "./ConsoleSessionError";
import { readConsoleCsrf } from "./readConsoleCsrf";
import { isTrustworthyConsoleOrigin } from "./isTrustworthyConsoleOrigin";

// SSO requests are never aborted or timed out: a cancelled request could still have been applied,
// and its late response must settle before the browser-marker lock is released.
export async function requestConsoleSso(
  fetchFn: typeof fetch,
  origin: string,
  readCookies: () => string,
  request: ConsoleSsoRequest,
): Promise<Response> {
  let base: URL;
  try {
    base = new URL(origin);
  } catch {
    throw new ConsoleSessionError("insecure_origin");
  }
  if (!isTrustworthyConsoleOrigin(base) || base.origin !== origin || base.username || base.password ||
      base.pathname !== "/" || base.search || base.hash) {
    throw new ConsoleSessionError("insecure_origin");
  }
  const headers = new Headers({ Accept: "application/json" });
  let body: string | undefined;
  if (request.body !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(request.body);
  }
  if (request.csrf) {
    let cookies: string;
    try {
      cookies = readCookies();
    } catch {
      throw new ConsoleSessionError("csrf_unavailable");
    }
    headers.set("X-Kafka3O-CSRF", readConsoleCsrf(cookies));
  }
  let response: Response;
  try {
    response = await fetchFn(new URL(request.path, base).href, {
      method: request.method, body, headers, credentials: "same-origin", mode: "same-origin",
      redirect: "error", cache: "no-store", referrerPolicy: "no-referrer",
    });
  } catch {
    throw new ConsoleSessionError("outcome_unknown");
  }
  if (response.redirected || (response.status >= 300 && response.status < 400)) {
    throw new ConsoleSessionError("outcome_unknown", response.status);
  }
  if (response.ok) {
    return response;
  }
  let problem: unknown;
  try {
    problem = await response.json();
  } catch {
    throw new ConsoleSessionError(response.status >= 500 ? "outcome_unknown" : "request_rejected", response.status);
  }
  const code = isRecord(problem) && problem.status === response.status && typeof problem.code === "string" ? problem.code : "";
  let mapped: ConsoleSessionErrorCode = response.status >= 500 ? "outcome_unknown" : "request_rejected";
  if (response.status === 503 && code === "sso_unavailable") mapped = "sso_unavailable";
  else if (response.status === 401 && code === "sign_in_denied") mapped = "sign_in_denied";
  else if ((response.status === 401 && code === "sign_in_failed") || (response.status === 400 && code === "invalid_callback")) mapped = "sign_in_failed";
  else if (response.status === 401 && code === "unauthorized") mapped = "unauthorized";
  else if (response.status === 409 && code === "invalid_browser_marker") mapped = "browser_verification_failed";
  else if (response.status === 409 && code === "already_signed_in") mapped = "already_signed_in";
  else if (response.status === 429 && code === "sign_in_throttled") mapped = "authentication_throttled";
  else if (response.status === 403 && code === "csrf_rejected") mapped = "csrf_rejected";
  throw new ConsoleSessionError(mapped, response.status);
}
