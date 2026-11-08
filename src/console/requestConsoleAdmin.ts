import { isRecord } from "../gateway/isRecord";
import type { ConsoleAdminOperation } from "./ConsoleAdmin";
import { ConsoleAdminError, type ConsoleAdminErrorCode } from "./ConsoleAdminError";
import { readConsoleCsrf } from "./readConsoleCsrf";

export async function requestConsoleAdmin(
  fetchFn: typeof fetch,
  origin: string,
  readCookies: () => string,
  timeoutMs: number,
  operation: ConsoleAdminOperation,
): Promise<unknown> {
  let base: URL;
  try {
    base = new URL(origin);
  } catch {
    throw new ConsoleAdminError("insecure_origin");
  }
  if (base.protocol !== "https:" || base.origin !== origin || base.username || base.password ||
      base.pathname !== "/" || base.search || base.hash || !Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 60_000) {
    throw new ConsoleAdminError("insecure_origin");
  }
  let path: string;
  let body: string | undefined;
  switch (operation.kind) {
    case "listAccess":
      path = operation.after ? `/api/admin/access?limit=100&after=${encodeURIComponent(operation.after)}` : "/api/admin/access?limit=100";
      break;
    case "listClusters":
      path = "/api/admin/clusters";
      break;
    case "listAudit":
      path = operation.query ? `/api/audit?${operation.query}` : "/api/audit";
      break;
    case "changeRoleGrant":
      path = "/api/admin/role-grants";
      body = JSON.stringify({ identityId: operation.identityId, clusterId: operation.clusterId, expectedRole: operation.expectedRole, role: operation.role });
      break;
    case "changeGroupMapping":
      path = "/api/admin/group-mappings";
      body = JSON.stringify({ issuer: operation.issuer, group: operation.group, clusterId: operation.clusterId, expectedRole: operation.expectedRole, role: operation.role });
      break;
    case "classifyCluster":
      path = `/api/admin/clusters/${encodeURIComponent(operation.clusterId)}/environment`;
      body = JSON.stringify({ expectedEnvironment: operation.expectedEnvironment, environment: operation.environment, reason: operation.reason });
      break;
    default:
      throw new ConsoleAdminError("invalid_request");
  }
  const write = body !== undefined;
  const headers = new Headers({ Accept: "application/json" });
  if (write) {
    headers.set("Content-Type", "application/json");
    let cookies: string;
    try {
      cookies = readCookies();
      headers.set("X-Kafka3O-CSRF", readConsoleCsrf(cookies));
    } catch {
      throw new ConsoleAdminError("csrf_unavailable");
    }
  }
  let response: Response;
  try {
    response = await fetchFn(new URL(path, base).href, {
      method: write ? "PUT" : "GET",
      body,
      headers,
      credentials: "same-origin",
      mode: "same-origin",
      redirect: "error",
      cache: "no-store",
      referrerPolicy: "no-referrer",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    // A write whose response was lost may have committed; it must be investigated, not retried.
    throw new ConsoleAdminError(write ? "outcome_unknown" : "service_unavailable");
  }
  if (response.redirected || (response.status >= 300 && response.status < 400)) {
    throw new ConsoleAdminError(write ? "outcome_unknown" : "service_unavailable", response.status);
  }
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ConsoleAdminError(write && (response.ok || response.status >= 500) ? "outcome_unknown" : "invalid_response", response.status);
  }
  if (response.ok) {
    return payload;
  }
  const problemCode = isRecord(payload) && payload.status === response.status && typeof payload.code === "string" ? payload.code : "";
  const operationId = isRecord(payload) && typeof payload.operationId === "string" ? payload.operationId : undefined;
  let code: ConsoleAdminErrorCode = write ? "outcome_unknown" : "service_unavailable";
  if (response.status === 401) code = "unauthorized";
  else if (response.status === 403 && problemCode === "global_admin_required") code = "global_admin_required";
  else if (response.status === 403 && problemCode === "password_change_required") code = "password_change_required";
  else if (response.status === 403 && problemCode === "self_access_change") code = "self_access_change";
  else if (response.status === 403 && problemCode === "audit_access_denied") code = "audit_access_denied";
  else if (response.status === 403) code = "global_admin_required";
  else if (response.status === 409 && problemCode === "policy_conflict") code = "policy_conflict";
  else if (response.status === 409 && problemCode === "last_global_admin") code = "last_global_admin";
  else if (response.status === 404) code = "not_found";
  else if (response.status === 400 && problemCode === "change_reason_required") code = "change_reason_required";
  else if (response.status >= 400 && response.status < 500) code = "invalid_request";
  else if (response.status >= 500 && problemCode.endsWith("_audit_unavailable")) code = "audit_unavailable";
  else if (response.status >= 500 && !write) code = "service_unavailable";
  throw new ConsoleAdminError(code, response.status, operationId);
}
