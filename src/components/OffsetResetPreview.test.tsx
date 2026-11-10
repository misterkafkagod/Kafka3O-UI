import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { HttpError } from "../gateway/HttpError";
import type { PreviewOffsetReset } from "../gateway/previewOffsetReset";
import type { ConsumerGroup } from "../gateway/types";
import { OffsetResetPreview } from "./OffsetResetPreview";

const group: ConsumerGroup = { id: "billing", protocol: "classic", state: "Empty", members: [], topics: ["orders", "payments"], partitions: [] };

describe("OffsetResetPreview", () => {
  it("previews a reset for the chosen topic and target without changing anything", async () => {
    const user = userEvent.setup();
    const preview = vi.fn<PreviewOffsetReset>().mockResolvedValue({
      group: "billing", topic: "payments",
      partitions: [{ partition: 0, currentOffset: "9007199254740993", targetOffset: "0" }, { partition: 1, currentOffset: null, targetOffset: "4" }],
    });
    render(<OffsetResetPreview gatewayUrl="https://gw" group={group} previewOffsetReset={preview} />);
    await user.click(screen.getByText("Reset offsets"));
    await user.selectOptions(screen.getByLabelText("Topic"), "payments");
    await user.click(screen.getByRole("radio", { name: "Earliest" }));
    await user.click(screen.getByRole("button", { name: "Preview" }));

    expect(preview).toHaveBeenCalledWith("https://gw", "billing", "payments", { kind: "earliest" });
    expect((await screen.findByRole("status")).textContent).toBe("Preview only. Nothing has been changed.");
    const table = screen.getByRole("table", { name: "Offset reset preview for billing on payments" });
    const [, body] = within(table).getAllByRole("rowgroup");
    expect(within(body).getAllByRole("row").map((row) => within(row).getAllByRole("cell").map((cell) => cell.textContent)))
      .toEqual([["0", "9007199254740993", "0"], ["1", "No commit", "4"]]);
  });

  it("sends a local date and time as milliseconds", async () => {
    const user = userEvent.setup();
    const preview = vi.fn<PreviewOffsetReset>().mockResolvedValue({ group: "billing", topic: "orders", partitions: [] });
    render(<OffsetResetPreview gatewayUrl="https://gw" group={group} previewOffsetReset={preview} />);
    await user.click(screen.getByText("Reset offsets"));
    await user.click(screen.getByRole("radio", { name: "Date and time" }));
    await user.type(screen.getByLabelText("Date and time (your local time)"), "2026-11-09T10:30:00");
    await user.click(screen.getByRole("button", { name: "Preview" }));

    expect(preview).toHaveBeenCalledWith("https://gw", "billing", "orders", { kind: "timestamp", timestamp: new Date("2026-11-09T10:30:00").getTime() });
  });

  it("explains refusals", async () => {
    const user = userEvent.setup();
    for (const [failure, message] of [
      [new HttpError(409, "active", { code: "group_active" }), /^Stop the group's consumers first/],
      [new HttpError(404, "missing", { code: "not_found", detail: "Topic \"orders\" was not found" }), /^Topic "orders" was not found$/],
      [new HttpError(503, "down"), /^Kafka could not be reached/],
    ] as const) {
      const preview = vi.fn<PreviewOffsetReset>().mockRejectedValue(failure);
      const { unmount } = render(<OffsetResetPreview gatewayUrl="https://gw" group={group} previewOffsetReset={preview} />);
      await user.click(screen.getByText("Reset offsets"));
      await user.click(screen.getByRole("button", { name: "Preview" }));
      expect((await screen.findByRole("alert")).textContent).toMatch(message);
      expect(screen.queryByRole("table")).toBeNull();
      unmount();
    }
  });

  it("says when a group has no topics to reset", () => {
    render(<OffsetResetPreview gatewayUrl="https://gw" group={{ ...group, topics: [] }} previewOffsetReset={vi.fn()} />);
    expect(screen.getByText("This group has no committed topics to reset.")).toBeDefined();
  });
});
