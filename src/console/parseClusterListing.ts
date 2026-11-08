import { isRecord } from "../gateway/isRecord";
import type { ClusterEnvironment, ClusterListing, RegisteredCluster } from "./ConsoleAdmin";
import { ConsoleAdminError } from "./ConsoleAdminError";

const environments: ReadonlySet<unknown> = new Set<ClusterEnvironment>(["", "NON_PRODUCTION", "PRODUCTION"]);

export function parseClusterListing(value: unknown): ClusterListing {
  const invalid = () => new ConsoleAdminError("invalid_response");
  if (!isRecord(value) || typeof value.operationId !== "string" || !Number.isSafeInteger(value.policyRevision) || !Array.isArray(value.clusters)) {
    throw invalid();
  }
  const clusters: RegisteredCluster[] = value.clusters.map((entry: unknown) => {
    if (!isRecord(entry) || typeof entry.id !== "string" || entry.id === "" || typeof entry.name !== "string" ||
        typeof entry.gatewayUrl !== "string" || !environments.has(entry.environment) || typeof entry.active !== "boolean") {
      throw invalid();
    }
    return { id: entry.id, name: entry.name, gatewayUrl: entry.gatewayUrl, environment: entry.environment as ClusterEnvironment, active: entry.active };
  });
  return { operationId: value.operationId, policyRevision: value.policyRevision as number, clusters };
}
