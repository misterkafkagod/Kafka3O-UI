import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { HttpError } from "../gateway/HttpError";
import type { ListBackups } from "../gateway/listBackups";
import type { ListTopics } from "../gateway/listTopics";
import { renderWithQuery } from "../test/renderWithQuery";
import { ClusterBackups } from "./ClusterBackups";

const gateway = { id: "kafka-a", name: "Kafka A", url: "https://gw" };
const topics = vi.fn<ListTopics>().mockResolvedValue([{ name: "orders", partitions: 1, replicationFactor: 1, internal: false, approxMessages: 1 }]);

describe("ClusterBackups", () => {
  it("lists backups and refreshes after a new one starts", async () => {
    const user = userEvent.setup();
    const list = vi.fn<ListBackups>().mockResolvedValueOnce([]).mockResolvedValue([
      { topic: "orders", connector: "kafka3o-backup-orders", location: "s3://b/kafka-a/orders/", state: "RUNNING" }]);
    renderWithQuery(<ClusterBackups gateway={gateway} listTopics={topics} listBackups={list}
      actions={{ start: vi.fn(async (_url, topic) => ({ topic, connector: `kafka3o-backup-${topic}`, location: "s3://b/kafka-a/orders/" })), confirm: () => true }} />);
    expect(await screen.findByText("No backups yet.")).toBeDefined();
    await user.click(await screen.findByRole("button", { name: "Start backup" }));
    expect(await screen.findByRole("rowheader", { name: "orders" })).toBeDefined();
    expect(list).toHaveBeenCalledTimes(2);
  });

  it("says when backups are not configured", async () => {
    const list = vi.fn<ListBackups>().mockRejectedValue(new HttpError(404, "none", { code: "backups_not_configured" }));
    renderWithQuery(<ClusterBackups gateway={gateway} listTopics={topics} listBackups={list} actions={{ start: vi.fn(), confirm: vi.fn() }} />);
    expect((await screen.findByText("Backups are not configured for this cluster.")).getAttribute("role")).toBe("status");
    expect(screen.queryByRole("button", { name: "Start backup" })).toBeNull();
  });

  it("offers Retry when Connect is unreachable", async () => {
    const user = userEvent.setup();
    const list = vi.fn<ListBackups>().mockRejectedValueOnce(new HttpError(503, "down", { code: "connect_unreachable" })).mockResolvedValue([]);
    renderWithQuery(<ClusterBackups gateway={gateway} listTopics={topics} listBackups={list} />);
    await user.click(await screen.findByRole("button", { name: "Retry" }));
    expect(await screen.findByText("No backups yet.")).toBeDefined();
  });

  it("follows a running restore until it finishes", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const running = { topic: "orders", connector: "kafka3o-backup-orders", location: "s3://b/kafka-a/orders/", state: "PAUSED",
        restore: { restoreId: "r-1", state: "RUNNING", restored: 1, total: 2, finished: false } };
      const list = vi.fn<ListBackups>().mockResolvedValueOnce([running])
        .mockResolvedValue([{ ...running, state: "RUNNING", restore: { ...running.restore, restored: 2, finished: true } }]);
      renderWithQuery(<ClusterBackups gateway={gateway} listTopics={topics} listBackups={list} />);
      expect(await screen.findByText("Restoring 1 of 2 records.")).toBeDefined();
      await vi.advanceTimersByTimeAsync(5100);
      expect(await screen.findByText("Last restore finished: 2 records restored.")).toBeDefined();
      const calls = list.mock.calls.length;
      await vi.advanceTimersByTimeAsync(6000);
      expect(list.mock.calls.length).toBe(calls);
    } finally {
      vi.useRealTimers();
    }
  });
});
