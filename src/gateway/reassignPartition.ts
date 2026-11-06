import type { FetchGatewayWrite } from "./GatewayWriteRequest";
import { requireAcceptedAdministration } from "./requireAcceptedAdministration";

export async function reassignPartition(fetchWrite: FetchGatewayWrite, gatewayUrl: string, topic: string, partition: number, replicas: number[]): Promise<void> {
  const url = `${gatewayUrl.replace(/\/+$/, "")}/api/v1/topics/${encodeURIComponent(topic)}/partitions/${partition}/replicas`;
  const response = await fetchWrite(url, { method: "POST", body: JSON.stringify({ replicas }) });
  requireAcceptedAdministration(response, "topic", topic);
}
