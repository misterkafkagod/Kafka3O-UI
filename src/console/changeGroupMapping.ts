import type { AccessChangeResult, AccessRole, ConsoleAdminTransport } from "./ConsoleAdmin";
import { parseAccessChangeResult } from "./parseAccessChangeResult";

export async function changeGroupMapping(transport: ConsoleAdminTransport, issuer: string, group: string, clusterId: string,
  expectedRole: AccessRole, role: AccessRole): Promise<AccessChangeResult> {
  return parseAccessChangeResult(await transport({ kind: "changeGroupMapping", issuer, group, clusterId, expectedRole, role }));
}
