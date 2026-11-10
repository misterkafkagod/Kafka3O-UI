import { ProductionChangeCanceled } from "../console/ProductionChangeCanceled";
import { describeAccessDenial } from "./describeAccessDenial";
import { HttpError } from "./HttpError";

export function describeOffsetResetError(error: unknown): string {
  if (error instanceof ProductionChangeCanceled) {
    return "Canceled; nothing was sent.";
  }
  if (error instanceof HttpError && ["offset_reset_unknown", "gateway_outcome_unknown", "outcome_unknown"].includes(error.problem?.code ?? "")) {
    return "The reset may have been applied; check the group's offsets before retrying.";
  }
  if (error instanceof HttpError && error.status === 409 && error.problem?.code === "stale_preview") {
    return "The offsets changed since the preview. Preview again.";
  }
  if (error instanceof HttpError && error.status === 409 && error.problem?.code === "group_active") {
    return "Stop the group's consumers first. Offsets can only be reset while the group has no members.";
  }
  if (error instanceof HttpError && error.status === 404) {
    return error.problem?.detail ?? "The consumer group or topic was not found.";
  }
  if (error instanceof HttpError && (error.status === 400 || error.status === 422)) {
    return "Choose a topic and a valid target.";
  }
  if (error instanceof HttpError && error.status === 403) {
    return describeAccessDenial(error.problem?.detail);
  }
  return "Kafka could not be reached. Try again.";
}
