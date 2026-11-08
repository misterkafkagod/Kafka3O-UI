import type { ClusterListing, ConsoleAdminTransport } from "./ConsoleAdmin";
import { parseClusterListing } from "./parseClusterListing";

export async function listClusters(transport: ConsoleAdminTransport): Promise<ClusterListing> {
  return parseClusterListing(await transport({ kind: "listClusters" }));
}
