import type { AuditFilters } from "./ConsoleAudit";

// buildAuditQuery encodes non-empty filters; datetime-local values are sent as UTC RFC 3339.
export function buildAuditQuery(filters: AuditFilters, after?: string, limit?: number): string {
  const params = new URLSearchParams();
  for (const key of ["cluster", "actor", "action", "outcome"] as const) {
    if (filters[key].trim() !== "") params.set(key, filters[key].trim());
  }
  for (const key of ["from", "until"] as const) {
    if (filters[key] !== "") params.set(key, new Date(filters[key]).toISOString().replace(/\.\d{3}Z$/, "Z"));
  }
  if (after) params.set("after", after);
  if (limit) params.set("limit", String(limit));
  return params.toString();
}
