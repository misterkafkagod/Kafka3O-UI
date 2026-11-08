import { isRecord } from "../gateway/isRecord";
import type { AuditEvent, AuditPage } from "./ConsoleAudit";
import { ConsoleAdminError } from "./ConsoleAdminError";

const textFields = ["occurredAt", "operationId", "actorId", "source", "clusterId", "environment", "action", "resourceKind", "resourceId",
  "decision", "outcome", "reason", "beforeState", "afterState"] as const;

export function parseAuditPage(value: unknown): AuditPage {
  if (!isRecord(value) || typeof value.operationId !== "string" || !Array.isArray(value.events) || typeof value.nextCursor !== "string") {
    throw new ConsoleAdminError("invalid_response");
  }
  const events = value.events.map((entry: unknown) => {
    if (!isRecord(entry) || !Number.isSafeInteger(entry.sequence) || textFields.some((field) => typeof entry[field] !== "string")) {
      throw new ConsoleAdminError("invalid_response");
    }
    return entry as unknown as AuditEvent;
  });
  return { operationId: value.operationId, events, nextCursor: value.nextCursor };
}
