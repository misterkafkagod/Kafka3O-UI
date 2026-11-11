import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithQuery } from "../test/renderWithQuery";
import { BackupList } from "./BackupList";

describe("BackupList", () => {
  it("lists state, location, last write and stored size, with errors below their row", () => {
    renderWithQuery(<BackupList gatewayId="kafka-a" backups={[
      { topic: "orders", connector: "kafka3o-backup-orders", location: "s3://b/kafka-a/orders/", state: "RUNNING",
        storage: { objects: 2, storedBytes: 3072, lastWrite: "2026-11-10T08:01:00Z" } },
      { topic: "payments", connector: "kafka3o-backup-payments", location: "s3://b/kafka-a/payments/", state: "FAILED", error: "ConnectException: bucket gone",
        storage: { objects: 0, storedBytes: 0, lastWrite: null } },
      { topic: "audit", connector: "kafka3o-backup-audit", location: "s3://b/kafka-a/audit/", state: "PAUSED" },
    ]} />);
    const table = screen.getByRole("table", { name: "Topic backups" });
    const row = (topic: string) => within(table).getByRole("rowheader", { name: topic }).closest("tr")!;
    expect(within(row("orders")).getAllByRole("cell").map((cell) => cell.textContent))
      .toEqual(["RUNNING", "s3://b/kafka-a/orders/", new Date("2026-11-10T08:01:00Z").toLocaleString(), "3.0 KB in 2 objects"]);
    expect(within(row("payments")).getAllByRole("cell").slice(2).map((cell) => cell.textContent)).toEqual(["Nothing written yet", "0 B in 0 objects"]);
    expect(screen.getByRole("cell", { name: "Error for payments" }).textContent).toBe("ConnectException: bucket gone");
    expect(within(row("audit")).getAllByRole("cell").slice(2).map((cell) => cell.textContent)).toEqual(["Unknown", "Unknown"]);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("links each topic to its Backup tab", () => {
    renderWithQuery(<BackupList gatewayId="dev & west" backups={[
      { topic: "orders & audit", connector: "kafka3o-backup-orders", location: "s3://b/x/", state: "RUNNING" }]} />);
    expect(screen.getByRole("link", { name: "orders & audit" }).getAttribute("href")).toBe("/clusters/dev%20%26%20west/topics/orders%20%26%20audit/backup");
  });

  it("says when there are no backups", () => {
    renderWithQuery(<BackupList gatewayId="kafka-a" backups={[]} />);
    expect(screen.getByText("No backups yet.")).toBeDefined();
  });

  it("shows restore progress, completion and failure", () => {
    const backup = { topic: "orders", connector: "kafka3o-backup-orders", location: "s3://b/kafka-a/orders/", state: "PAUSED" };
    const { unmount } = renderWithQuery(<BackupList gatewayId="kafka-a" backups={[
      { ...backup, restore: { restoreId: "r-1", state: "RUNNING", restored: 12, total: 21, finished: false } }]} />);
    expect(screen.getByRole("cell", { name: "Restore of orders" }).textContent).toBe("Restoring 12 of 21 records.");
    unmount();
    const finished = renderWithQuery(<BackupList gatewayId="kafka-a" backups={[
      { ...backup, state: "RUNNING", restore: { restoreId: "r-1", state: "RUNNING", restored: 21, total: 21, finished: true } }]} />);
    expect(screen.getByRole("cell", { name: "Restore of orders" }).textContent).toBe("Last restore finished: 21 records restored.");
    finished.unmount();
    renderWithQuery(<BackupList gatewayId="kafka-a" backups={[
      { ...backup, restore: { restoreId: "r-1", state: "FAILED", restored: 3, total: 21, finished: false, error: "DataException: malformed backup record" } }]} />);
    expect(screen.getByRole("cell", { name: "Restore of orders" }).textContent).toBe("Restore failed: DataException: malformed backup record");
  });
});
