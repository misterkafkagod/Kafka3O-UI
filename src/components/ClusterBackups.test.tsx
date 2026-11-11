import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { HttpError } from "../gateway/HttpError";
import type { ListBackups } from "../gateway/listBackups";
import { renderWithQuery } from "../test/renderWithQuery";
import { ClusterBackups } from "./ClusterBackups";

const gateway = { id: "kafka-a", name: "Kafka A", url: "https://gw" };

describe("ClusterBackups", () => {
  it("lists backups without actions and points to the topics' Backup tabs", async () => {
    const list = vi.fn<ListBackups>().mockResolvedValue([
      { topic: "orders", connector: "kafka3o-backup-orders", location: "s3://b/kafka-a/orders/", state: "RUNNING" }]);
    renderWithQuery(<ClusterBackups gateway={gateway} listBackups={list} />);
    expect((await screen.findByRole("link", { name: "orders" })).getAttribute("href")).toBe("/clusters/kafka-a/topics/orders/backup");
    expect(screen.getByText(/Start, change and restore a backup on its topic's Backup tab\./)).toBeDefined();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("says when backups are not configured", async () => {
    const list = vi.fn<ListBackups>().mockRejectedValue(new HttpError(404, "none", { code: "backups_not_configured" }));
    renderWithQuery(<ClusterBackups gateway={gateway} listBackups={list} />);
    expect((await screen.findByText("Backups are not configured for this cluster.")).getAttribute("role")).toBe("status");
  });

  it("offers Retry when Connect is unreachable", async () => {
    const user = userEvent.setup();
    const list = vi.fn<ListBackups>().mockRejectedValueOnce(new HttpError(503, "down", { code: "connect_unreachable" })).mockResolvedValue([]);
    renderWithQuery(<ClusterBackups gateway={gateway} listBackups={list} />);
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
      renderWithQuery(<ClusterBackups gateway={gateway} listBackups={list} />);
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
