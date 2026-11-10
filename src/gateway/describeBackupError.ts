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
    case "not_found":
      return "This topic no longer has a backup. Refresh the list.";
    case "backup_exists":
      return "This topic is already backed up.";
    case "backups_not_configured":
      return "Backups are not configured for this cluster.";
    case "invalid_topic":
      return "Choose a valid topic.";
    case "connect_rejected":
      return "Kafka Connect rejected the backup. Check the Connect tab and try again.";
    default:
      return "Kafka Connect could not be reached. Try again.";
  }
}
