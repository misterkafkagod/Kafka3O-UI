import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProductionChangeCanceled } from "../console/ProductionChangeCanceled";
import { HttpError } from "../gateway/HttpError";
import type { TopicBackup } from "../gateway/listBackups";
import type { RunBackupAction } from "../gateway/runBackupAction";
import { renderWithQuery } from "../test/renderWithQuery";
import { TopicBackupActions } from "./TopicBackupActions";

const running: TopicBackup = { topic: "orders", connector: "kafka3o-backup-orders", location: "s3://b/kafka-a/orders/", state: "RUNNING" };
const start = vi.fn();

describe("TopicBackupActions", () => {
  it("pauses a running backup after confirmation", async () => {
    const user = userEvent.setup();
    const run = vi.fn<RunBackupAction>().mockResolvedValue(undefined);
    const confirm = vi.fn(() => true);
    const onChanged = vi.fn();
    renderWithQuery(<TopicBackupActions backup={running} gatewayUrl="https://gw" actions={{ start, run, confirm }} onChanged={onChanged} />);
    await user.click(screen.getByRole("button", { name: "Pause" }));
    expect(confirm).toHaveBeenCalledWith('Pause the backup of "orders"? New messages are not stored until it resumes.');
    expect(run).toHaveBeenCalledWith("https://gw", "orders", "pause");
    expect((await screen.findByRole("status")).textContent).toBe("Pause requested for the backup of orders.");
    expect(onChanged).toHaveBeenCalled();
  });

  it("resumes a paused backup and deletes the job", async () => {
    const user = userEvent.setup();
    const run = vi.fn<RunBackupAction>().mockResolvedValue(undefined);
    renderWithQuery(<TopicBackupActions backup={{ ...running, state: "PAUSED" }} gatewayUrl="https://gw" actions={{ start, run, confirm: () => true }} onChanged={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Pause" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Resume" }));
    expect(run).toHaveBeenLastCalledWith("https://gw", "orders", "resume");
    await user.click(screen.getByRole("button", { name: "Delete backup job" }));
    expect(run).toHaveBeenLastCalledWith("https://gw", "orders", "delete");
    expect((await screen.findByRole("status")).textContent).toBe("The backup job for orders was deleted. Its stored objects are kept.");
  });

  it("sends nothing when the confirmation is canceled", async () => {
    const user = userEvent.setup();
    const run = vi.fn<RunBackupAction>();
    renderWithQuery(<TopicBackupActions backup={running} gatewayUrl="https://gw" actions={{ start, run, confirm: () => false }} onChanged={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Delete backup job" }));
    expect(run).not.toHaveBeenCalled();
  });

  it("reports a canceled Production reason and a denial", async () => {
    const user = userEvent.setup();
    const run = vi.fn<RunBackupAction>().mockRejectedValueOnce(new ProductionChangeCanceled())
      .mockRejectedValueOnce(new HttpError(403, "denied", { code: "forbidden", detail: "Not permitted: change_reason_required" }));
    renderWithQuery(<TopicBackupActions backup={running} gatewayUrl="https://gw" actions={{ start, run, confirm: () => true }} onChanged={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Pause" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Canceled; nothing was sent.");
    await user.click(screen.getByRole("button", { name: "Pause" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Production changes need a recorded change reason.");
  });

  it("shows no buttons without run or without a job", () => {
    const { unmount } = renderWithQuery(<TopicBackupActions backup={running} gatewayUrl="https://gw" actions={{ start, confirm: () => true }} onChanged={vi.fn()} />);
    expect(screen.queryByRole("button")).toBeNull();
    unmount();
    renderWithQuery(<TopicBackupActions backup={{ ...running, state: "NO JOB" }} gatewayUrl="https://gw" actions={{ start, run: vi.fn(), confirm: () => true }} onChanged={vi.fn()} />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
