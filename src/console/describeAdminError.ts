import { ConsoleAdminError } from "./ConsoleAdminError";

// describeAdminError explains an administration failure; unknown outcomes must be investigated, not retried.
export function describeAdminError(error: unknown): string {
  const code = error instanceof ConsoleAdminError ? error.code : "service_unavailable";
  const operation = error instanceof ConsoleAdminError && error.operationId ? ` Operation ID: ${error.operationId}.` : "";
  switch (code) {
    case "unauthorized":
      return "Your session ended. Sign in again.";
    case "global_admin_required":
      return "Only a local global administrator can manage access and cluster classification.";
    case "password_change_required":
      return "Change your temporary password before managing access.";
    case "self_access_change":
      return "You cannot change your own access. Ask another global administrator.";
    case "audit_access_denied":
      return "Audit for a cluster requires ADMIN on it; all-cluster audit requires global ADMIN.";
    case "policy_conflict":
      return "Access changed since this page loaded. Review the reloaded values and try again.";
    case "last_global_admin":
      return "The last enabled local global administrator cannot be removed.";
    case "not_found":
      return "The identity or cluster no longer exists or is not an active registered cluster.";
    case "change_reason_required":
      return "Enter a reason for this classification change.";
    case "invalid_request":
      return "The change was rejected as invalid. Check the values and try again.";
    case "audit_unavailable":
      return `The audit trail is unavailable, so nothing was changed. Try again later.${operation}`;
    case "outcome_unknown":
      return `The change may or may not have been applied. Do not retry it; reload and check the audit trail first.${operation}`;
    case "csrf_unavailable":
      return "Your session is missing its request protection. Sign in again.";
    default:
      return "The Console administration service is unavailable. Try again later.";
  }
}
