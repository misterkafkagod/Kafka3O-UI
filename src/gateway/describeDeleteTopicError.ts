import { HttpError } from "./HttpError";

export function describeDeleteTopicError(error: unknown): string {
  if (error instanceof HttpError && error.status === 401) {
    return "Authentication required. Enter or update this gateway's token.";
  }
  if (error instanceof HttpError && error.status === 404) {
    return "The topic was not found; it may already have been deleted.";
  }
  if (error instanceof HttpError && [400, 403, 413, 422].includes(error.status)) {
    return "The deletion request was rejected. Check the topic and gateway permissions.";
  }
  return "Topic deletion could not be confirmed. The topic may already be deleting; check the cluster before retrying.";
}
