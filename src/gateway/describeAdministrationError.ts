import { HttpError } from "./HttpError";

export function describeAdministrationError(error: unknown): { message: string; uncertain: boolean } {
  if (error instanceof HttpError) {
    if (error.status === 401) return { message: "Authentication required. Enter or update this gateway's token.", uncertain: false };
    if (error.problem?.code === "configuration_write_unknown" || error.problem?.code === "partition_write_unknown") {
      return { message: "The change may have been accepted. Refresh the current state before retrying.", uncertain: true };
    }
    if (error.problem?.code === "cluster_unreachable") {
      return { message: "Kafka could not be read or validated; no change was submitted.", uncertain: false };
    }
    if (error.problem?.code === "reassignment_in_progress") {
      return { message: "A reassignment is already in progress. Wait for it to finish.", uncertain: false };
    }
    if ([400, 403, 404, 409, 413, 422].includes(error.status)) {
      return { message: "The change was rejected. Check the current state, values, and Kafka permissions.", uncertain: false };
    }
  }
  return { message: "The change could not be confirmed and may have been accepted. Refresh the current state before retrying.", uncertain: true };
}
