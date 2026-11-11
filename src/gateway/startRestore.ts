import type { FetchGatewayWrite } from "./GatewayWriteRequest";

// skipped counts stored objects written with another compression, which this restore does not read.
export type StartedRestore = { topic: string; restoreId: string; objects: number; skipped?: number };

export type StartRestore = (gatewayUrl: string, topic: string) => Promise<StartedRestore>;

// startRestore asks the Gateway to restore a topic's backup into the topic; restored records are appended.
export async function startRestore(fetchWrite: FetchGatewayWrite, gatewayUrl: string, topic: string): Promise<StartedRestore> {
  const result = await fetchWrite(`${gatewayUrl.replace(/\/+$/, "")}/api/v1/backups/${encodeURIComponent(topic)}/restore`, { method: "POST" });
  if (typeof result !== "object" || result === null || !("topic" in result) || result.topic !== topic || !("restoreId" in result)) {
    throw new Error("The gateway returned an invalid restore response.");
  }
  return result as StartedRestore;
}
