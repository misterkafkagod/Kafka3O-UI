import type { FetchJson } from "./fetchJson";

export type OffsetResetTarget = { kind: "earliest" } | { kind: "latest" } | { kind: "timestamp"; timestamp: number };

export type OffsetResetPreview = {
  group: string;
  topic: string;
  // Offsets are strings so 64-bit values stay exact.
  partitions: { partition: number; currentOffset: string | null; targetOffset: string }[];
};

export type PreviewOffsetReset = (gatewayUrl: string, group: string, topic: string, target: OffsetResetTarget) => Promise<OffsetResetPreview>;

export async function previewOffsetReset(fetchJson: FetchJson, gatewayUrl: string, group: string, topic: string,
  target: OffsetResetTarget): Promise<OffsetResetPreview> {
  const query = new URLSearchParams({ topic, target: target.kind });
  if (target.kind === "timestamp") query.set("timestamp", String(target.timestamp));
  const url = `${gatewayUrl.replace(/\/+$/, "")}/api/v1/consumer-groups/${encodeURIComponent(group)}/offset-reset?${query}`;
  return (await fetchJson(url)) as OffsetResetPreview;
}
