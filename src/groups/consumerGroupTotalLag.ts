import type { ConsumerGroup } from "../gateway/types";

export type ConsumerGroupTotalLag =
  | { kind: "known"; lag: string }
  | { kind: "unknown"; partitions: number }
  | { kind: "none" };

// consumerGroupTotalLag sums exact decimal lags; a partition without a lag makes the total unknown, never zero.
export function consumerGroupTotalLag(group: ConsumerGroup): ConsumerGroupTotalLag {
  if (group.partitions.length === 0) {
    return { kind: "none" };
  }
  const unknown = group.partitions.filter((partition) => partition.lag === null).length;
  if (unknown > 0) {
    return { kind: "unknown", partitions: unknown };
  }
  const lag = group.partitions.reduce((sum, partition) => sum + BigInt(partition.lag ?? "0"), 0n);
  return { kind: "known", lag: lag.toString() };
}
