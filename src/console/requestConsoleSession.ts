import { isRecord } from "../gateway/isRecord";
import type { ConsoleSessionOperation } from "./ConsoleSession";
import { ConsoleSessionError, type ConsoleSessionErrorCode } from "./ConsoleSessionError";
import { readConsoleCsrf } from "./readConsoleCsrf";
import { isTrustworthyConsoleOrigin } from "./isTrustworthyConsoleOrigin";

export async function requestConsoleSession(
  fetchFn: typeof fetch,
  origin: string,
  readCookies: () => string,
  timeoutMs: number,
  operation: ConsoleSessionOperation,
  signal?: AbortSignal,
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
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 60_000) {
    throw new ConsoleSessionError("invalid_configuration");
  }
  if (signal?.aborted) {
    throw new ConsoleSessionError("request_aborted");
  }
  let path: string;
  let body: string | undefined;
  switch (operation.kind) {
    case "inspect":
      path = "/api/session";
      break;
    case "login":
      path = "/api/session/local";
      body = JSON.stringify({ username: operation.username, password: operation.password });
      break;
    case "changePassword":
      path = "/api/session/password";
      body = JSON.stringify({ currentPassword: operation.currentPassword, newPassword: operation.newPassword });
      break;
    case "logout":
      path = "/api/session/logout";
      break;
    default:
      throw new ConsoleSessionError("invalid_configuration");
  }
  const headers = new Headers({ Accept: "application/json" });
  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  if (operation.kind === "changePassword" || operation.kind === "logout") {
    let cookies: string;
    try {
      cookies = readCookies();
    } catch {
      throw new ConsoleSessionError("csrf_unavailable");
    }
    headers.set("X-Kafka3O-CSRF", readConsoleCsrf(cookies));
  }
  const requestSignal = signal ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]) : AbortSignal.timeout(timeoutMs);
  let response: Response;
  try {
    response = await fetchFn(new URL(path, base).href, {
      method: operation.kind === "inspect" ? "GET" : "POST",
      body,
      headers,
      credentials: "same-origin",
      mode: "same-origin",
      redirect: "error",
      cache: "no-store",
      referrerPolicy: "no-referrer",
      signal: requestSignal,
    });
  } catch {
    if (operation.kind !== "inspect") {
      throw new ConsoleSessionError("outcome_unknown");
    }
    throw new ConsoleSessionError(signal?.aborted ? "request_aborted" : "service_unavailable");
  }
  if (response.redirected || (response.status >= 300 && response.status < 400) || response.status >= 500) {
    throw new ConsoleSessionError(operation.kind === "inspect" ? "service_unavailable" : "outcome_unknown", response.status);
  }
  if (response.ok) {
    return response;
  }
  let problem: unknown;
  try {
    problem = await response.json();
  } catch {
    throw new ConsoleSessionError(operation.kind === "inspect" ? "invalid_response" : "outcome_unknown", response.status);
  }
  if (!isRecord(problem) || problem.status !== response.status || typeof problem.code !== "string") {
    throw new ConsoleSessionError(operation.kind === "inspect" ? "invalid_response" : "outcome_unknown", response.status);
  }
  let code: ConsoleSessionErrorCode = "request_rejected";
  if (response.status === 401 && problem.code === "unauthorized") code = "unauthorized";
  else if (response.status === 401 && problem.code === "authentication_failed") code = "authentication_failed";
  else if (response.status === 429 && problem.code === "authentication_throttled") code = "authentication_throttled";
  else if (response.status === 409 && problem.code === "already_signed_in") code = "already_signed_in";
  else if (response.status === 400 && problem.code === "invalid_password") code = "invalid_password";
  else if (response.status === 400 && problem.code === "invalid_request") code = "invalid_request";
  else if (response.status === 403 && problem.code === "csrf_rejected") code = "csrf_rejected";
  else if (response.status === 403 && problem.code === "password_change_required") code = "password_change_required";
  throw new ConsoleSessionError(code, response.status);
}
