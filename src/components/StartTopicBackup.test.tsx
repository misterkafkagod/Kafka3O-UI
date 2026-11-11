import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { HttpError } from "../gateway/HttpError";
import type { StartBackup } from "../gateway/startBackup";
import { renderWithQuery } from "../test/renderWithQuery";
import { StartTopicBackup } from "./StartTopicBackup";

const gateway = { id: "kafka-a", name: "Kafka A", url: "https://gw" };
const started = vi.fn<StartBackup>(async (_url, topic) => ({ topic, connector: `kafka3o-backup-${topic}`, location: `s3://b/kafka-a/${topic}/` }));

describe("StartTopicBackup", () => {
  it("starts with the default settings", async () => {
    const user = userEvent.setup();
    const start = vi.fn(started);
    const onStarted = vi.fn();
    renderWithQuery(<StartTopicBackup gateway={gateway} topicName="orders" actions={{ start, confirm: () => true }} onStarted={onStarted} />);
    await user.click(screen.getByRole("button", { name: "Start backup" }));
    expect(start).toHaveBeenCalledWith("https://gw", "orders", { startFrom: "earliest", compression: "gzip", recordsPerFile: 0 });
    expect((await screen.findByRole("status")).textContent).toBe("Backup started for orders. Messages are stored in s3://b/kafka-a/orders/.");
    expect(onStarted).toHaveBeenCalled();
  });

  it("sends the chosen settings", async () => {
    const user = userEvent.setup();
    const start = vi.fn(started);
    renderWithQuery(<StartTopicBackup gateway={gateway} topicName="orders" actions={{ start, confirm: () => true }} />);
    await user.selectOptions(screen.getByLabelText("Back up"), "latest");
    await user.selectOptions(screen.getByLabelText("Compression"), "zstd");
    await user.clear(screen.getByLabelText("Records per file"));
    await user.type(screen.getByLabelText("Records per file"), "100");
    await user.click(screen.getByRole("button", { name: "Start backup" }));
    expect(start).toHaveBeenCalledWith("https://gw", "orders", { startFrom: "latest", compression: "zstd", recordsPerFile: 100 });
  });

  it("does not send an invalid record limit", async () => {
    const user = userEvent.setup();
    const start = vi.fn(started);
    const confirm = vi.fn(() => true);
    renderWithQuery(<StartTopicBackup gateway={gateway} topicName="orders" actions={{ start, confirm }} />);
    for (const bad of ["2000000", "-1", "1.5", "lots"]) {
      await user.clear(screen.getByLabelText("Records per file"));
      await user.type(screen.getByLabelText("Records per file"), bad);
      expect(screen.getByLabelText("Records per file").getAttribute("aria-invalid")).toBe("true");
      await user.click(screen.getByRole("button", { name: "Start backup" }));
      expect(screen.getByRole("alert").textContent).toBe("Records per file must be a whole number from 0 to 1,000,000.");
    }
    expect(start).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
  });

  it("sends nothing when the confirmation is canceled", async () => {
    const user = userEvent.setup();
    const start = vi.fn(started);
    renderWithQuery(<StartTopicBackup gateway={gateway} topicName="orders" actions={{ start, confirm: () => false }} />);
    await user.click(screen.getByRole("button", { name: "Start backup" }));
    expect(start).not.toHaveBeenCalled();
  });

  it("shows the Gateway's refusal", async () => {
    const user = userEvent.setup();
    const start = vi.fn<StartBackup>().mockRejectedValue(new HttpError(400, "bad", { code: "invalid_backup_settings", detail: "the backup settings are invalid: compression must be gzip, zstd, snappy or none" }));
    renderWithQuery(<StartTopicBackup gateway={gateway} topicName="orders" actions={{ start, confirm: () => true }} />);
    await user.click(screen.getByRole("button", { name: "Start backup" }));
    expect((await screen.findByRole("alert")).textContent).toBe("The backup settings are invalid: compression must be gzip, zstd, snappy or none.");
  });
});
