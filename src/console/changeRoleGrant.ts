import type { AccessChangeResult, AccessRole, ConsoleAdminTransport } from "./ConsoleAdmin";
import { parseAccessChangeResult } from "./parseAccessChangeResult";

export async function changeRoleGrant(transport: ConsoleAdminTransport, identityId: string, clusterId: string,
  expectedRole: AccessRole, role: AccessRole): Promise<AccessChangeResult> {
  return parseAccessChangeResult(await transport({ kind: "changeRoleGrant", identityId, clusterId, expectedRole, role }));
}
