import { isRecord } from "../gateway/isRecord";
import type { AccessChangeResult } from "./ConsoleAdmin";
import { ConsoleAdminError } from "./ConsoleAdminError";

export function parseAccessChangeResult(value: unknown): AccessChangeResult {
  if (!isRecord(value) || typeof value.operationId !== "string" || value.operationId === "" ||
      !Number.isSafeInteger(value.policyRevision) || (value.policyRevision as number) < 0) {
    // A success response that cannot be read leaves the change unconfirmed.
    throw new ConsoleAdminError("outcome_unknown");
  }
  return { operationId: value.operationId, policyRevision: value.policyRevision as number };
}
