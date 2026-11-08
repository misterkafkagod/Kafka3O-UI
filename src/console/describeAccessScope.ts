import type { RegisteredCluster } from "./ConsoleAdmin";

// describeAccessScope names a grant scope; an empty cluster ID is a global grant.
export function describeAccessScope(clusterId: string, clusters: readonly RegisteredCluster[]): string {
  if (clusterId === "") return "All clusters";
  const cluster = clusters.find((entry) => entry.id === clusterId);
  if (!cluster) return `Cluster ${clusterId} (not registered)`;
  return `Cluster ${cluster.name} (${cluster.id})${cluster.active ? "" : ", inactive"}`;
}
