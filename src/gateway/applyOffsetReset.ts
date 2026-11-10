import type { FetchGatewayWrite } from "./GatewayWriteRequest";
import type { OffsetResetPreview } from "./previewOffsetReset";

export type AppliedOffsetReset = {
  group: string;
  topic: string;
  partitions: { partition: number; committedOffset: string }[];
};

export type ApplyOffsetReset = (gatewayUrl: string, preview: OffsetResetPreview) => Promise<AppliedOffsetReset>;

// applyOffsetReset sends exactly the previewed targets with the offsets the preview saw, so the Gateway refuses
// a reset whose basis has changed.
export async function applyOffsetReset(fetchWrite: FetchGatewayWrite, gatewayUrl: string, preview: OffsetResetPreview): Promise<AppliedOffsetReset> {
  const url = `${gatewayUrl.replace(/\/+$/, "")}/api/v1/consumer-groups/${encodeURIComponent(preview.group)}/offset-reset`;
  const result = await fetchWrite(url, {
    method: "POST",
    body: JSON.stringify({
      topic: preview.topic,
      partitions: preview.partitions.map((partition) => ({
        partition: partition.partition, expectedOffset: partition.currentOffset, targetOffset: partition.targetOffset,
      })),
    }),
  });
  if (typeof result !== "object" || result === null || !("partitions" in result) || !Array.isArray(result.partitions) ||
      !("group" in result) || result.group !== preview.group || !("topic" in result) || result.topic !== preview.topic) {
    throw new Error("The gateway returned an invalid offset reset response.");
  }
  return result as AppliedOffsetReset;
}
