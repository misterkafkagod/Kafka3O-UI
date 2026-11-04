import type { ConsumerGroupPartition } from "../gateway/types";

export function consumerLagStatusLabel(status: ConsumerGroupPartition["status"]): string {
  switch (status) {
    case "ok":
      return "Available";
    case "no_commit":
      return "No committed offset";
    case "out_of_range":
      return "Commit outside log range";
    case "unavailable":
      return "Unavailable";
    default:
      return "Unknown status";
  }
}
