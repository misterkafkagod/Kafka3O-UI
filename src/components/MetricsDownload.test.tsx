import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ClusterMetrics } from "../gateway/getMetrics";
import { MetricsDownload } from "./MetricsDownload";

const metrics: ClusterMetrics = {
  readAt: "2026-11-10T12:00:00Z",
  logDirs: { dirs: [] },
  partitions: { topics: 1, partitions: 1, underReplicated: 0, offline: 0, belowMinIsr: 0, unreadableTopics: [] },
  largestTopics: { topics: [] },
  endOffsets: { topics: [] },
};

describe("MetricsDownload", () => {
  it("saves the metrics on screen as JSON and CSV", async () => {
    const save = vi.fn();
    render(<MetricsDownload clusterId="kafka-a" metrics={metrics} saveFile={save} />);

    await userEvent.click(screen.getByRole("button", { name: "Download JSON" }));
    await userEvent.click(screen.getByRole("button", { name: "Download CSV" }));

    expect(save.mock.calls[0][0]).toBe("kafka-a-metrics-2026-11-10T12-00-00Z.json");
    expect(save.mock.calls[0][1]).toBe("application/json");
    expect(JSON.parse(save.mock.calls[0][2])).toEqual(metrics);
    expect(save.mock.calls[1].slice(0, 2)).toEqual(["kafka-a-metrics-2026-11-10T12-00-00Z.csv", "text/csv"]);
    expect(save.mock.calls[1][2]).toContain("read_at,,,,,2026-11-10T12:00:00Z");
  });
});
