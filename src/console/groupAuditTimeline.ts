import type { AuditEvent } from "./ConsoleAudit";

// groupAuditTimeline keeps events in order and groups those sharing an operation ID (intent, decision, outcome).
export function groupAuditTimeline(events: readonly AuditEvent[]): { operationId: string; events: AuditEvent[] }[] {
  const groups: { operationId: string; events: AuditEvent[] }[] = [];
  const index = new Map<string, number>();
  for (const event of events) {
    const key = event.operationId || `event-${event.sequence}`;
    const position = index.get(key);
    if (position === undefined) {
      index.set(key, groups.length);
      groups.push({ operationId: key, events: [event] });
    } else {
      groups[position].events.push(event);
    }
  }
  return groups;
}
