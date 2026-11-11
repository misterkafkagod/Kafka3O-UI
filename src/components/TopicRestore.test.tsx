import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { HttpError } from "../gateway/HttpError";
import type { TopicBackup } from "../gateway/listBackups";
import type { StartRestore } from "../gateway/startRestore";
import { renderWithQuery } from "../test/renderWithQuery";
import { TopicRestore } from "./TopicRestore";

const backup: TopicBackup = { topic: "orders", connector: "kafka3o-backup-orders", location: "s3://b/kafka-a/orders/", state: "RUNNING" };
const start = vi.fn();

describe("TopicRestore", () => {
  it("starts a restore after the append confirmation", async () => {
    const user = userEvent.setup();
    const restore = vi.fn<StartRestore>().mockResolvedValue({ topic: "orders", restoreId: "r-1", objects: 3, skipped: 0 });
    const confirm = vi.fn((_message: string) => true);
    const onStarted = vi.fn();
    renderWithQuery(<TopicRestore backup={backup} gatewayUrl="https://gw" actions={{ start, restore, confirm }} onStarted={onStarted} />);
    await user.click(screen.getByRole("button", { name: "Restore" }));
    expect(confirm.mock.calls[0][0]).toContain("appended to the topic, so messages still in it may be duplicated");
    expect(restore).toHaveBeenCalledWith("https://gw", "orders");
    expect((await screen.findByRole("status")).textContent).toBe("Restore started for orders from 3 stored objects.");
    expect(onStarted).toHaveBeenCalled();
  });

  it("says when objects in another compression are not restored", async () => {
    const user = userEvent.setup();
    const restore = vi.fn<StartRestore>().mockResolvedValue({ topic: "orders", restoreId: "r-1", objects: 1, skipped: 2 });
    renderWithQuery(<TopicRestore backup={backup} gatewayUrl="https://gw" actions={{ start, restore, confirm: () => true }} onStarted={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Restore" }));
    expect((await screen.findByRole("status")).textContent).toBe(
      "Restore started for orders from 1 stored object. 2 older objects were written with another compression and are not restored.");
  });

  it("sends nothing when the confirmation is canceled", async () => {
    const user = userEvent.setup();
    const restore = vi.fn<StartRestore>();
    renderWithQuery(<TopicRestore backup={backup} gatewayUrl="https://gw" actions={{ start, restore, confirm: () => false }} onStarted={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Restore" }));
    expect(restore).not.toHaveBeenCalled();
  });

  it("is disabled while a restore runs", () => {
    renderWithQuery(<TopicRestore backup={{ ...backup, restore: { restoreId: "r-1", state: "RUNNING", restored: 1, total: 4, finished: false } }}
      gatewayUrl="https://gw" actions={{ start, restore: vi.fn(), confirm: () => true }} onStarted={vi.fn()} />);
    expect((screen.getByRole("button", { name: "Restore running…" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("explains a refusal", async () => {
    const user = userEvent.setup();
    const restore = vi.fn<StartRestore>().mockRejectedValue(new HttpError(404, "empty", { code: "nothing_to_restore" }));
    renderWithQuery(<TopicRestore backup={backup} gatewayUrl="https://gw" actions={{ start, restore, confirm: () => true }} onStarted={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Restore" }));
    expect((await screen.findByRole("alert")).textContent).toBe("This backup has not stored any messages yet.");
  });

  it("is hidden without the restore action", () => {
    renderWithQuery(<TopicRestore backup={backup} gatewayUrl="https://gw" actions={{ start, confirm: () => true }} onStarted={vi.fn()} />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
