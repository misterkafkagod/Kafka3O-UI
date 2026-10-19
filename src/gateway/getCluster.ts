import type { FetchJson } from "./fetchJson";
import type { ClusterInfo } from "./types";

export type GetCluster = (gatewayUrl: string) => Promise<ClusterInfo>;

export async function getCluster(fetchJson: FetchJson, gatewayUrl: string): Promise<ClusterInfo> {
  return (await fetchJson(`${gatewayUrl.replace(/\/+$/, "")}/api/v1/cluster`)) as ClusterInfo;
}
