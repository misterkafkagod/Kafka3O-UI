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
    expect(restore).toHaveBeenCalledWith("https://gw", "orders", undefined);
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

  it("restores only some partitions in a time range", async () => {
    const user = userEvent.setup();
    const restore = vi.fn<StartRestore>().mockResolvedValue({ topic: "orders", restoreId: "r-1", objects: 1, skipped: 0 });
    const confirm = vi.fn((_message: string) => true);
    renderWithQuery(<TopicRestore backup={backup} gatewayUrl="https://gw" actions={{ start, restore, confirm }} onStarted={vi.fn()} />);
    await user.click(screen.getByRole("radio", { name: "Only some messages" }));
    await user.type(screen.getByLabelText("From (local time)"), "2026-11-11T01:00:00");
    await user.type(screen.getByLabelText("Before (local time)"), "2026-11-11T02:00:00");
    await user.type(screen.getByLabelText("Partitions"), "2, 0");
    await user.click(screen.getByRole("button", { name: "Restore" }));
    expect(restore).toHaveBeenCalledWith("https://gw", "orders", {
      from: new Date("2026-11-11T01:00:00").toISOString(), to: new Date("2026-11-11T02:00:00").toISOString(), partitions: [0, 2] });
    expect(confirm.mock.calls[0][0]).toContain('Restore the backed-up messages of "orders" in partitions 0, 2 from ');
  });

  it("restores one partition without a time range", async () => {
    const user = userEvent.setup();
    const restore = vi.fn<StartRestore>().mockResolvedValue({ topic: "orders", restoreId: "r-1", objects: 1, skipped: 0 });
    renderWithQuery(<TopicRestore backup={backup} gatewayUrl="https://gw" actions={{ start, restore, confirm: () => true }} onStarted={vi.fn()} />);
    await user.click(screen.getByRole("radio", { name: "Only some messages" }));
    await user.type(screen.getByLabelText("Partitions"), "1");
    await user.click(screen.getByRole("button", { name: "Restore" }));
    expect(restore).toHaveBeenCalledWith("https://gw", "orders", { partitions: [1] });
  });

  it("does not send a reversed range or bad partitions", async () => {
    const user = userEvent.setup();
    const restore = vi.fn<StartRestore>();
    const confirm = vi.fn(() => true);
    renderWithQuery(<TopicRestore backup={backup} gatewayUrl="https://gw" actions={{ start, restore, confirm }} onStarted={vi.fn()} />);
    await user.click(screen.getByRole("radio", { name: "Only some messages" }));
    await user.type(screen.getByLabelText("From (local time)"), "2026-11-11T02:00:00");
    await user.type(screen.getByLabelText("Before (local time)"), "2026-11-11T01:00:00");
    await user.click(screen.getByRole("button", { name: "Restore" }));
    expect(screen.getByRole("alert").textContent).toBe("The start time must be before the end time.");
    await user.clear(screen.getByLabelText("Before (local time)"));
    await user.type(screen.getByLabelText("Partitions"), "one");
    await user.click(screen.getByRole("button", { name: "Restore" }));
    expect(screen.getByRole("alert").textContent).toBe("Partitions must be numbers separated by commas, for example 0, 2.");
    expect(restore).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
  });

  it("shows the Gateway's refusal of a selection", async () => {
    const user = userEvent.setup();
    const restore = vi.fn<StartRestore>().mockRejectedValue(new HttpError(400, "bad", { code: "invalid_restore_filter", detail: "the restore selection is invalid: partition 7 has no stored messages in this backup" }));
    renderWithQuery(<TopicRestore backup={backup} gatewayUrl="https://gw" actions={{ start, restore, confirm: () => true }} onStarted={vi.fn()} />);
    await user.click(screen.getByRole("radio", { name: "Only some messages" }));
    await user.type(screen.getByLabelText("Partitions"), "7");
    await user.click(screen.getByRole("button", { name: "Restore" }));
    expect((await screen.findByRole("alert")).textContent).toBe("The restore selection is invalid: partition 7 has no stored messages in this backup.");
  });
});

