import type { AuditFilters, AuditPage } from "./ConsoleAudit";
import type { ConsoleAdminTransport } from "./ConsoleAdmin";
import { buildAuditQuery } from "./buildAuditQuery";
import { parseAuditPage } from "./parseAuditPage";

export async function listAuditEvents(transport: ConsoleAdminTransport, filters: AuditFilters, after?: string): Promise<AuditPage> {
  return parseAuditPage(await transport({ kind: "listAudit", query: buildAuditQuery(filters, after, 100) }));
}
