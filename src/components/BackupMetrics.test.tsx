import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { formatBytes } from "../groups/formatBytes";
import { renderWithQuery } from "../test/renderWithQuery";
import { BackupMetrics } from "./BackupMetrics";

describe("BackupMetrics", () => {
  it("shows each backup's state, last write age, size and restore", () => {
    renderWithQuery(<BackupMetrics gatewayId="kafka-a" readAt="2026-11-11T03:35:30Z" backups={{ backups: [
      { topic: "orders", state: "RUNNING", storageListed: true, objects: 10, storedBytes: 1900, lastWrite: "2026-11-11T03:30:30Z", restoring: false },
      { topic: "empty", state: "RUNNING", storageListed: true, objects: 0, storedBytes: 0, lastWrite: null, restoring: false },
      { topic: "paused", state: "PAUSED", storageListed: false, objects: null, storedBytes: null, lastWrite: null, restoring: true },
      { topic: "failed", state: "FAILED", error: "ConnectException: bucket gone", storageListed: false, objects: null, storedBytes: null, lastWrite: null, restoring: false },
    ] }} />);
    const rows = within(screen.getByRole("table", { name: "Backup health" })).getAllByRole("row").slice(1)
      .map((row) => [...row.children].map((cell) => cell.textContent));
    expect(rows).toEqual([
      ["orders", "RUNNING", "5 minutes ago", `${formatBytes(1900)} in 10 objects`, ""],
      ["empty", "RUNNING", "Nothing written yet", `${formatBytes(0)} in 0 objects`, ""],
      ["paused", "PAUSED", "Unknown", "Unknown", "Running"],
      ["failed", "FAILED: ConnectException: bucket gone", "Unknown", "Unknown", ""],
    ]);
    expect(screen.getByRole("link", { name: "orders" }).getAttribute("href")).toBe("/clusters/kafka-a/topics/orders/backup");
  });

  it("says when backups are not configured, unavailable or absent", () => {
    const first = renderWithQuery(<BackupMetrics gatewayId="kafka-b" readAt="2026-11-11T03:35:30Z" backups={{ notConfigured: true, backups: [] }} />);
    expect(screen.getByRole("status").textContent).toBe("Backups are not configured for this cluster.");
    first.unmount();
    const second = renderWithQuery(<BackupMetrics gatewayId="kafka-a" readAt="2026-11-11T03:35:30Z" backups={{ error: "kafka connect is unreachable", backups: [] }} />);
    expect(screen.getByRole("alert").textContent).toBe("Unavailable: kafka connect is unreachable");
    second.unmount();
    renderWithQuery(<BackupMetrics gatewayId="kafka-a" readAt="2026-11-11T03:35:30Z" backups={{ backups: [] }} />);
    expect(screen.getByText("No backups yet.")).toBeDefined();
  });
});
