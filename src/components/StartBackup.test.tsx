import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { HttpError } from "../gateway/HttpError";
import type { ListTopics } from "../gateway/listTopics";
import type { BackupActions, StartBackup as Start } from "../gateway/startBackup";
import { renderWithQuery } from "../test/renderWithQuery";
import { StartBackup } from "./StartBackup";

const gateway = { id: "kafka-a", name: "Kafka A", url: "https://gw" };
const listTopics = vi.fn<ListTopics>().mockResolvedValue([
  { name: "__consumer_offsets", partitions: 50, replicationFactor: 1, internal: true, approxMessages: 0 },
  { name: "kafka3o-m10-verify", partitions: 1, replicationFactor: 1, internal: false, approxMessages: 22 },
  { name: "orders", partitions: 3, replicationFactor: 1, internal: false, approxMessages: 5 },
]);

function actions(start: Start, confirm = () => true): BackupActions {
  return { start: vi.fn(start), confirm: vi.fn(confirm) };
}

describe("StartBackup", () => {
  it("starts a backup of the chosen topic after confirmation", async () => {
    const user = userEvent.setup();
    const onStarted = vi.fn();
    const bundle = actions(async (_url, topic) => ({ topic, connector: `kafka3o-backup-${topic}`, location: `s3://kafka3o-backups/kafka-a/${topic}/` }));
    renderWithQuery(<StartBackup gateway={gateway} listTopics={listTopics} actions={bundle} onStarted={onStarted} />);
    const select = await screen.findByLabelText("Topic");
    expect([...select.querySelectorAll("option")].map((option) => option.textContent)).toEqual(["kafka3o-m10-verify", "orders"]);
    await user.selectOptions(select, "orders");
    await user.click(screen.getByRole("button", { name: "Start backup" }));

    expect(bundle.confirm).toHaveBeenCalledWith(expect.stringContaining('Start a continuous backup of "orders" on Kafka A?'));
    expect(bundle.start).toHaveBeenCalledWith("https://gw", "orders");
    expect((await screen.findByRole("status")).textContent).toBe("Backup started for orders. Messages are stored in s3://kafka3o-backups/kafka-a/orders/.");
    expect(onStarted).toHaveBeenCalledOnce();
  });

  it("sends nothing when canceled and explains refusals", async () => {
    const user = userEvent.setup();
    const start = vi.fn<Start>().mockRejectedValue(new HttpError(409, "exists", { code: "backup_exists" }));
    const confirm = vi.fn(() => false);
    renderWithQuery(<StartBackup gateway={gateway} listTopics={listTopics} actions={{ start, confirm }} />);
    await user.click(await screen.findByRole("button", { name: "Start backup" }));
    expect(start).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "Start backup" }));
    expect((await screen.findByRole("alert")).textContent).toBe("This topic is already backed up.");
  });
});
