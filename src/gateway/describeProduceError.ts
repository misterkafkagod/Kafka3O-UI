import { HttpError } from "./HttpError";

export function describeProduceError(error: unknown): string {
  if (error instanceof HttpError && error.status === 401) {
    return "Authentication required. Enter or update this gateway's token.";
  }
  if (error instanceof HttpError && [400, 403, 413, 422].includes(error.status)) {
    return "The message was rejected. Check the value, key, headers, and gateway permissions.";
  }
  return "Delivery could not be confirmed. The message may already have been written; check the topic before sending again.";
}
