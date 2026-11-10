import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ClusterMetrics } from "../gateway/getMetrics";
import { TopicThroughput } from "./TopicThroughput";

const sample = (readAt: string, topics: ClusterMetrics["endOffsets"]["topics"], error?: string): ClusterMetrics => ({
  readAt,
  logDirs: { dirs: [] },
  partitions: { topics: 0, partitions: 0, underReplicated: 0, offline: 0, belowMinIsr: 0, unreadableTopics: [] },
  largestTopics: { topics: [] },
  endOffsets: { error, topics },
});
const first = sample("2026-11-10T12:00:00Z", [{ topic: "orders", endOffset: "0" }, { topic: "audit", endOffset: "0" }, { topic: "idle", endOffset: "5" }, { topic: "gone", endOffset: "9" }]);
const second = sample("2026-11-10T12:00:10Z", [{ topic: "orders", endOffset: "25" }, { topic: "audit", endOffset: "300" }, { topic: "idle", endOffset: "5" }, { topic: "gone", endOffset: "0" }]);

describe("TopicThroughput", () => {
  it("says it is measuring until a second sample exists", () => {
    render(<TopicThroughput current={first} />);
    expect(screen.getByRole("status").textContent).toBe("Measuring… a rate needs a second sample.");
  });

  it("shows the cluster rate and active topics highest first, and names topics without a rate", () => {
    render(<TopicThroughput previous={first} current={second} />);
    expect(screen.getByText("Cluster: 33 messages/s over the last 10 seconds")).toBeDefined();
    const rows = within(screen.getByRole("table", { name: "Throughput by topic" })).getAllByRole("row").slice(1);
    expect(rows.map((row) => row.textContent)).toEqual(["audit30 messages/s", "orders2.5 messages/s"]);
    expect(screen.getByText("No rate for: gone")).toBeDefined();
  });

  it("shows an unavailable section", () => {
    render(<TopicThroughput previous={first} current={sample("2026-11-10T12:00:10Z", [], "list end offsets: refused")} />);
    expect(screen.getByRole("alert").textContent).toBe("Unavailable: list end offsets: refused");
  });
});
