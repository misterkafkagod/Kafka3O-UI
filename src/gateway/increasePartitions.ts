import type { FetchGatewayWrite } from "./GatewayWriteRequest";
import { requireAcceptedAdministration } from "./requireAcceptedAdministration";

export async function increasePartitions(fetchWrite: FetchGatewayWrite, gatewayUrl: string, topic: string, count: number): Promise<void> {
  const url = `${gatewayUrl.replace(/\/+$/, "")}/api/v1/topics/${encodeURIComponent(topic)}/partitions`;
  const response = await fetchWrite(url, { method: "POST", body: JSON.stringify({ count }) });
  requireAcceptedAdministration(response, "topic", topic);
}
