import { HttpError } from "./HttpError";

export function describeCreateTopicError(error: unknown): string {
  if (error instanceof HttpError && error.status === 401) {
    return "Authentication required. Enter or update this gateway's token.";
  }
  if (error instanceof HttpError && error.status === 409) {
    return "A topic with this name already exists.";
  }
  if (error instanceof HttpError && [400, 403, 413, 422].includes(error.status)) {
    return "The topic creation request was rejected. Check the parameters and gateway permissions.";
  }
  return "Topic creation could not be confirmed. The topic may already exist; check the cluster before retrying.";
}
