import { HttpError } from "./HttpError";

export function describeOffsetResetError(error: unknown): string {
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
    return "You are not permitted to do this on this cluster.";
  }
  return "Kafka could not be reached. Try again.";
}
