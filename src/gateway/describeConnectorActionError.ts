import { ProductionChangeCanceled } from "../console/ProductionChangeCanceled";
import { describeAccessDenial } from "./describeAccessDenial";
import { HttpError } from "./HttpError";

export function describeConnectorActionError(error: unknown): string {
  if (error instanceof ProductionChangeCanceled) {
    return "Canceled; nothing was sent.";
  }
  const code = error instanceof HttpError ? error.problem?.code ?? "" : "";
  if (["connect_action_unknown", "gateway_outcome_unknown", "outcome_unknown"].includes(code)) {
    return "The action may have been applied. Refresh before retrying.";
  }
  if (error instanceof HttpError && error.status === 403) {
    return describeAccessDenial(error.problem?.detail);
  }
  if (code === "not_found") {
    return "The connector or task no longer exists. Refresh the list.";
  }
  if (code === "connect_rejected") {
    return "Kafka Connect rejected the action. Refresh and try again.";
  }
  if (code === "connect_not_configured") {
    return "Kafka Connect is not configured for this cluster.";
  }
  return "Kafka Connect could not be reached. Try again.";
}
