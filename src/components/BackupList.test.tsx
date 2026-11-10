import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BackupList } from "./BackupList";

describe("BackupList", () => {
  it("lists state, location, last write and stored size, with errors below their row", () => {
    render(<BackupList backups={[
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
  });

  it("says when there are no backups", () => {
    render(<BackupList backups={[]} />);
    expect(screen.getByText("No backups yet.")).toBeDefined();
  });
});
