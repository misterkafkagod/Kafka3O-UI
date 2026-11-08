export type ConsoleAdminErrorCode =
  | "insecure_origin"
  | "csrf_unavailable"
  | "unauthorized"
  | "global_admin_required"
  | "password_change_required"
  | "self_access_change"
  | "policy_conflict"
  | "last_global_admin"
  | "not_found"
  | "change_reason_required"
  | "invalid_request"
  | "audit_unavailable"
  | "outcome_unknown"
  | "service_unavailable"
  | "invalid_response";

export class ConsoleAdminError extends Error {
  readonly code: ConsoleAdminErrorCode;
  readonly status?: number;
  readonly operationId?: string;

  constructor(code: ConsoleAdminErrorCode, status?: number, operationId?: string) {
    super(`Console administration request: ${code}`);
    this.name = "ConsoleAdminError";
    this.code = code;
    this.status = status;
    this.operationId = operationId;
  }
}
