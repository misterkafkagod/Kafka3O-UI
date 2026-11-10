import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { HttpError } from "../gateway/HttpError";
import type { RunBackupAction } from "../gateway/runBackupAction";
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

  it("pauses, resumes and deletes after confirmation, keeping stored data", async () => {
    const user = userEvent.setup();
    const run = vi.fn<RunBackupAction>().mockResolvedValue(undefined);
    const confirm = vi.fn(() => true);
    const onChanged = vi.fn();
    render(<BackupList gatewayUrl="https://gw" onChanged={onChanged} actions={{ start: vi.fn(), run, confirm }} backups={[
      { topic: "orders", connector: "kafka3o-backup-orders", location: "s3://b/kafka-a/orders/", state: "RUNNING" },
      { topic: "audit", connector: "kafka3o-backup-audit", location: "s3://b/kafka-a/audit/", state: "PAUSED" },
    ]} />);
    await user.click(screen.getByRole("button", { name: "Pause the backup of orders" }));
    expect(run).toHaveBeenLastCalledWith("https://gw", "orders", "pause");
    expect((await screen.findByRole("status")).textContent).toBe("Pause requested for the backup of orders.");
    await user.click(screen.getByRole("button", { name: "Resume the backup of audit" }));
    expect(run).toHaveBeenLastCalledWith("https://gw", "audit", "resume");
    await user.click(screen.getByRole("button", { name: "Delete the backup job for orders" }));
    expect(confirm).toHaveBeenLastCalledWith('Delete the backup job for "orders"? The stored objects are kept; only the job stops.');
    expect(run).toHaveBeenLastCalledWith("https://gw", "orders", "delete");
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(3));
  });

  it("sends nothing when canceled and explains failures", async () => {
    const user = userEvent.setup();
    const run = vi.fn<RunBackupAction>().mockRejectedValue(new HttpError(503, "unknown", { code: "connect_action_unknown" }));
    const confirm = vi.fn(() => false);
    render(<BackupList gatewayUrl="https://gw" actions={{ start: vi.fn(), run, confirm }}
      backups={[{ topic: "orders", connector: "kafka3o-backup-orders", location: "s3://b/kafka-a/orders/", state: "RUNNING" }]} />);
    await user.click(screen.getByRole("button", { name: "Delete the backup job for orders" }));
    expect(run).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "Delete the backup job for orders" }));
    expect((await screen.findByRole("alert")).textContent).toBe("The change may have been applied. Refresh before retrying.");
  });
});
