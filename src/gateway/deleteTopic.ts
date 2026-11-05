import type { FetchGatewayWrite } from "./GatewayWriteRequest";

export type DeleteTopic = (gatewayUrl: string, name: string) => Promise<void>;
export type ConfirmTopicDeletion = (name: string) => boolean;

export async function deleteTopic(fetchWrite: FetchGatewayWrite, gatewayUrl: string, name: string): Promise<void> {
  const result = await fetchWrite(`${gatewayUrl.replace(/\/+$/, "")}/api/v1/topics/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
  if (typeof result !== "object" || result === null || !("name" in result) || !("status" in result) ||
      result.name !== name || result.status !== "accepted") {
    throw new Error("The gateway returned an invalid topic deletion response.");
  }
}
