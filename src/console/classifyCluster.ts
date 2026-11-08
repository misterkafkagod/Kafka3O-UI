import type { AccessChangeResult, ClusterEnvironment, ConsoleAdminTransport } from "./ConsoleAdmin";
import { parseAccessChangeResult } from "./parseAccessChangeResult";

export async function classifyCluster(transport: ConsoleAdminTransport, clusterId: string, expectedEnvironment: ClusterEnvironment,
  environment: Exclude<ClusterEnvironment, "">, reason: string): Promise<AccessChangeResult> {
  return parseAccessChangeResult(await transport({ kind: "classifyCluster", clusterId, expectedEnvironment, environment, reason }));
}
