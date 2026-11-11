import { ProductionChangeCanceled } from "../console/ProductionChangeCanceled";
import { describeAccessDenial } from "./describeAccessDenial";
import { HttpError } from "./HttpError";

export function describeBackupError(error: unknown): string {
  if (error instanceof ProductionChangeCanceled) {
    return "Canceled; nothing was sent.";
  }
  const code = error instanceof HttpError ? error.problem?.code ?? "" : "";
  if (["connect_action_unknown", "gateway_outcome_unknown", "outcome_unknown"].includes(code)) {
    return "The change may have been applied. Refresh before retrying.";
  }
  if (error instanceof HttpError && error.status === 403) {
    return describeAccessDenial(error.problem?.detail);
  }
  switch (code) {
    case "restore_in_progress":
      return "A restore of this topic is already running.";
    case "nothing_to_restore":
      return "This backup has not stored any messages yet.";
    case "storage_unavailable":
      return "The backup storage cannot be read right now. Try again.";
    case "not_found":
      return "This topic no longer has a backup. Refresh the list.";
    case "backup_exists":
      return "This topic is already backed up.";
    case "backups_not_configured":
      return "Backups are not configured for this cluster.";
    case "invalid_backup_settings":
    case "invalid_restore_filter":
      // The Gateway's detail names what was refused, e.g. "the backup settings are invalid: compression must be …".
      return error instanceof HttpError && error.problem?.detail
        ? `${error.problem.detail.charAt(0).toUpperCase()}${error.problem.detail.slice(1)}.`
        : code === "invalid_restore_filter" ? "The restore selection is invalid." : "The backup settings are invalid.";
    case "invalid_topic":
      return "Choose a valid topic.";
    case "connect_rejected":
      return "Kafka Connect rejected the backup. Check the Connect tab and try again.";
    default:
      return "Kafka Connect could not be reached. Try again.";
  }
}
