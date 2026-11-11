import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { HttpError } from "../gateway/HttpError";
import type { ListBackups, TopicBackup as Backup } from "../gateway/listBackups";
import { formatBytes } from "../groups/formatBytes";
import { renderWithQuery } from "../test/renderWithQuery";
import { TopicBackup } from "./TopicBackup";

const gateway = { id: "kafka-a", name: "Kafka A", url: "https://gw" };
const orders: Backup = {
  topic: "orders", connector: "kafka3o-backup-orders", location: "s3://b/kafka-a/orders/", state: "RUNNING",
  storage: { objects: 2, storedBytes: 2048, lastWrite: "2026-11-10T08:01:00Z" },
  settings: { startFrom: "latest", compression: "zstd", recordsPerFile: 100 },
};

describe("TopicBackup", () => {
  it("shows the topic's running backup with its settings", async () => {
    const list = vi.fn<ListBackups>().mockResolvedValue([{ ...orders, topic: "payments", connector: "kafka3o-backup-payments" }, orders]);
    renderWithQuery(<TopicBackup gateway={gateway} topicName="orders" listBackups={list} />);
    const details = await screen.findByLabelText("Backup of orders");
    expect(within(details).getByText("RUNNING")).toBeDefined();
    expect(within(details).getByText("s3://b/kafka-a/orders/")).toBeDefined();
    expect(within(details).getByText(`${formatBytes(2048)} in 2 objects`)).toBeDefined();
    expect(within(details).getByText("Messages from when the backup started")).toBeDefined();
    expect(within(details).getByText("zstd")).toBeDefined();
    expect(within(details).getByText("Up to 100 per file, written as messages arrive")).toBeDefined();
  });

  it("shows paused and failed backups with their error", async () => {
    const list = vi.fn<ListBackups>().mockResolvedValue([{ ...orders, state: "FAILED", error: "ConnectException: bucket gone" }]);
    renderWithQuery(<TopicBackup gateway={gateway} topicName="orders" listBackups={list} />);
    expect(await screen.findByText("FAILED")).toBeDefined();
    expect(screen.getByRole("alert").textContent).toBe("ConnectException: bucket gone");
  });

  it("shows a paused backup with its restore progress", async () => {
    const list = vi.fn<ListBackups>().mockResolvedValue([{ ...orders, state: "PAUSED",
      restore: { restoreId: "r-1", state: "RUNNING", restored: 3, total: 7, finished: false } }]);
    renderWithQuery(<TopicBackup gateway={gateway} topicName="orders" listBackups={list} />);
    expect(await screen.findByText("PAUSED")).toBeDefined();
    expect(screen.getByText("Restoring 3 of 7 records.")).toBeDefined();
  });

  it("says Unknown for settings and storage it could not read", async () => {
    const list = vi.fn<ListBackups>().mockResolvedValue([{ topic: "orders", connector: "kafka3o-backup-orders", location: "s3://b/kafka-a/orders/", state: "RUNNING" }]);
    renderWithQuery(<TopicBackup gateway={gateway} topicName="orders" listBackups={list} />);
    await screen.findByText("RUNNING");
    expect(screen.getAllByText("Unknown")).toHaveLength(5);
  });

  it("says when the topic has no backup", async () => {
    const list = vi.fn<ListBackups>().mockResolvedValue([{ ...orders, topic: "payments" }]);
    renderWithQuery(<TopicBackup gateway={gateway} topicName="orders" listBackups={list} />);
    expect(await screen.findByText("No backup for this topic.")).toBeDefined();
  });

  it("says when backups are not configured", async () => {
    const list = vi.fn<ListBackups>().mockRejectedValue(new HttpError(404, "none", { code: "backups_not_configured" }));
    renderWithQuery(<TopicBackup gateway={gateway} topicName="orders" listBackups={list} />);
    expect((await screen.findByText("Backups are not configured for this cluster.")).getAttribute("role")).toBe("status");
  });

  it("offers Retry when Connect is unreachable", async () => {
    const user = userEvent.setup();
    const list = vi.fn<ListBackups>().mockRejectedValueOnce(new HttpError(503, "down", { code: "connect_unreachable" })).mockResolvedValue([]);
    renderWithQuery(<TopicBackup gateway={gateway} topicName="orders" listBackups={list} />);
    await user.click(await screen.findByRole("button", { name: "Retry" }));
    expect(await screen.findByText("No backup for this topic.")).toBeDefined();
  });
});
