import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ClusterMetrics as Metrics } from "../gateway/getMetrics";
import { renderWithQuery } from "../test/renderWithQuery";
import { ClusterMetrics } from "./ClusterMetrics";

const gateway = { id: "dev", name: "Dev", url: "http://localhost:8081" };
const metrics: Metrics = {
  readAt: "2026-11-10T12:00:00Z",
  logDirs: { dirs: [{ broker: 1, dir: "/data", totalBytes: 100, usableBytes: 60, kafkaBytes: 7 }] },
  partitions: { topics: 1, partitions: 3, underReplicated: 0, offline: 0, belowMinIsr: 0, unreadableTopics: [] },
  largestTopics: { topics: [{ topic: "orders", bytes: 7 }] },
  endOffsets: { topics: [{ topic: "orders", endOffset: "10" }] },
};

describe("ClusterMetrics", () => {
  it("announces loading, then shows the disk use", async () => {
    const list = vi.fn(async () => metrics);
    renderWithQuery(<ClusterMetrics gateway={gateway} getMetrics={list} />);
    expect(screen.getByRole("status").textContent).toBe("Loading metrics…");
    expect(await screen.findByRole("table", { name: "Broker disk use" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Partition health" })).toBeDefined();
    expect(screen.getByRole("table", { name: "Largest topics" })).toBeDefined();
    expect(list).toHaveBeenCalledWith(gateway.url);
  });

  it("shows the controller quorum when the Gateway reports it", async () => {
    const withQuorum = { ...metrics, quorum: { leaderId: 1, leaderEpoch: 3, highWatermark: 9, replicas: [{ id: 1, role: "voter", logEndOffset: 9, lag: 0, lastFetch: null, lastCaughtUp: null }] } };
    renderWithQuery(<ClusterMetrics gateway={gateway} getMetrics={async () => withQuorum} />);
    expect(await screen.findByRole("table", { name: "Controller quorum replicas" })).toBeDefined();
  });

  it("shows Gateway errors with Retry", async () => {
    const list = vi.fn().mockRejectedValueOnce(new TypeError("Failed to fetch")).mockResolvedValueOnce(metrics);
    renderWithQuery(<ClusterMetrics gateway={gateway} getMetrics={list} />);
    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("Gateway unreachable")).toBeDefined();
    await userEvent.click(within(alert).getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("table", { name: "Broker disk use" })).toBeDefined();
  });

  it("shows a rate once a second sample arrives", async () => {
    const list = vi.fn()
      .mockResolvedValueOnce(metrics)
      .mockResolvedValue({ ...metrics, readAt: "2026-11-10T12:00:10Z", endOffsets: { topics: [{ topic: "orders", endOffset: "60" }] } });
    const { container } = renderWithQuery(<ClusterMetrics gateway={gateway} getMetrics={list} />);
    expect(await screen.findByText("Measuring… a rate needs a second sample.")).toBeDefined();
    await userEvent.click(within(container).getByRole("button", { name: "Refresh now" }));
    expect(await screen.findByText("Cluster: 5.0 messages/s over the last 10 seconds")).toBeDefined();
  });

  it("downloads the metrics on screen", async () => {
    const save = vi.fn();
    renderWithQuery(<ClusterMetrics gateway={gateway} getMetrics={async () => metrics} saveFile={save} />);
    await userEvent.click(await screen.findByRole("button", { name: "Download CSV" }));
    expect(save).toHaveBeenCalledWith("dev-metrics-2026-11-10T12-00-00Z.csv", "text/csv", expect.stringContaining("topic_end_offset,,,orders,,10"));
  });
});
