export type ConsoleSessionErrorCode =
  | "insecure_origin"
  | "invalid_configuration"
  | "csrf_unavailable"
  | "request_aborted"
  | "service_unavailable"
  | "outcome_unknown"
  | "invalid_response"
  | "unauthorized"
  | "authentication_failed"
  | "authentication_throttled"
  | "already_signed_in"
  | "invalid_password"
  | "invalid_request"
  | "csrf_rejected"
  | "password_change_required"
  | "request_rejected";

export class ConsoleSessionError extends Error {
  readonly code: ConsoleSessionErrorCode;
  readonly status?: number;

  constructor(code: ConsoleSessionErrorCode, status?: number) {
    super(`Console session request: ${code}`);
    this.name = "ConsoleSessionError";
    this.code = code;
    this.status = status;
  }
}
