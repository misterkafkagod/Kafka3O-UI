import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProductionChangeCanceled } from "../console/ProductionChangeCanceled";
import type { ApplyOffsetReset } from "../gateway/applyOffsetReset";
import { HttpError } from "../gateway/HttpError";
import type { OffsetResetActions } from "../gateway/OffsetResetActions";
import type { OffsetResetPreview as Preview, PreviewOffsetReset } from "../gateway/previewOffsetReset";
import type { ConsumerGroup } from "../gateway/types";
import { OffsetResetPreview } from "./OffsetResetPreview";

const group: ConsumerGroup = { id: "billing", protocol: "classic", state: "Empty", members: [], topics: ["orders", "payments"], partitions: [] };
const preview: Preview = {
  group: "billing", topic: "payments",
  partitions: [{ partition: 0, currentOffset: "9007199254740993", targetOffset: "0" }, { partition: 1, currentOffset: null, targetOffset: "4" }],
};

function actions(overrides: Partial<OffsetResetActions> = {}): OffsetResetActions {
  return {
    preview: vi.fn<PreviewOffsetReset>().mockResolvedValue(preview),
    apply: vi.fn<ApplyOffsetReset>().mockResolvedValue({ group: "billing", topic: "payments", partitions: [] }),
    confirm: vi.fn(() => true),
    ...overrides,
  };
}

async function showPreview(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByText("Reset offsets"));
  await user.selectOptions(screen.getByLabelText("Topic"), "payments");
  await user.click(screen.getByRole("button", { name: "Preview" }));
  await screen.findByRole("table");
}

describe("OffsetResetPreview", () => {
  it("previews a reset for the chosen topic and target without changing anything", async () => {
    const user = userEvent.setup();
    const bundle = actions();
    render(<OffsetResetPreview gatewayUrl="https://gw" group={group} actions={bundle} onApplied={vi.fn()} />);
    await user.click(screen.getByText("Reset offsets"));
    await user.selectOptions(screen.getByLabelText("Topic"), "payments");
    await user.click(screen.getByRole("radio", { name: "Earliest" }));
    await user.click(screen.getByRole("button", { name: "Preview" }));

    expect(bundle.preview).toHaveBeenCalledWith("https://gw", "billing", "payments", { kind: "earliest" });
    expect((await screen.findByRole("status")).textContent).toBe("Preview only. Nothing has been changed.");
    const table = screen.getByRole("table", { name: "Offset reset preview for billing on payments" });
    const [, body] = within(table).getAllByRole("rowgroup");
    expect(within(body).getAllByRole("row").map((row) => within(row).getAllByRole("cell").map((cell) => cell.textContent)))
      .toEqual([["0", "9007199254740993", "0"], ["1", "No commit", "4"]]);
    expect(bundle.apply).not.toHaveBeenCalled();
  });

  it("sends a local date and time as milliseconds", async () => {
    const user = userEvent.setup();
    const bundle = actions();
    render(<OffsetResetPreview gatewayUrl="https://gw" group={group} actions={bundle} onApplied={vi.fn()} />);
    await user.click(screen.getByText("Reset offsets"));
    await user.click(screen.getByRole("radio", { name: "Date and time" }));
    await user.type(screen.getByLabelText("Date and time (your local time)"), "2026-11-09T10:30:00");
    await user.click(screen.getByRole("button", { name: "Preview" }));

    expect(bundle.preview).toHaveBeenCalledWith("https://gw", "billing", "orders", { kind: "timestamp", timestamp: new Date("2026-11-09T10:30:00").getTime() });
  });

  it("applies the previewed reset after confirmation and reloads the group", async () => {
    const user = userEvent.setup();
    const bundle = actions();
    const onApplied = vi.fn();
    render(<OffsetResetPreview gatewayUrl="https://gw" group={group} actions={bundle} onApplied={onApplied} />);
    await showPreview(user);
    await user.click(screen.getByRole("button", { name: "Apply reset" }));

    expect(bundle.confirm).toHaveBeenCalledWith('Reset 2 partitions of "payments" for consumer group "billing" to the previewed offsets?');
    expect(bundle.apply).toHaveBeenCalledWith("https://gw", preview);
    expect((await screen.findByRole("status")).textContent).toBe("Offsets reset for 2 partitions of payments.");
    expect(onApplied).toHaveBeenCalledOnce();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("sends nothing when the confirmation is canceled", async () => {
    const user = userEvent.setup();
    const bundle = actions({ confirm: vi.fn(() => false) });
    render(<OffsetResetPreview gatewayUrl="https://gw" group={group} actions={bundle} onApplied={vi.fn()} />);
    await showPreview(user);
    await user.click(screen.getByRole("button", { name: "Apply reset" }));

    expect(bundle.apply).not.toHaveBeenCalled();
    expect(screen.getByRole("table")).toBeDefined();
  });

  it("explains refusals of a preview or a reset", async () => {
    const user = userEvent.setup();
    for (const [stage, failure, message] of [
      ["preview", new HttpError(409, "active", { code: "group_active" }), /^Stop the group's consumers first/],
      ["preview", new HttpError(404, "missing", { code: "not_found", detail: "Topic \"orders\" was not found" }), /^Topic "orders" was not found$/],
      ["preview", new HttpError(503, "down"), /^Kafka could not be reached/],
      ["apply", new HttpError(409, "stale", { code: "stale_preview" }), /^The offsets changed since the preview/],
      ["apply", new HttpError(503, "unknown", { code: "offset_reset_unknown" }), /^The reset may have been applied/],
      ["apply", new HttpError(403, "denied", { code: "forbidden", detail: "Not permitted: production_admin_required" }), /only an ADMIN/],
      ["apply", new ProductionChangeCanceled(), /^Canceled; nothing was sent\.$/],
    ] as const) {
      const bundle = stage === "preview"
        ? actions({ preview: vi.fn<PreviewOffsetReset>().mockRejectedValue(failure) })
        : actions({ apply: vi.fn<ApplyOffsetReset>().mockRejectedValue(failure) });
      const onApplied = vi.fn();
      const { unmount } = render(<OffsetResetPreview gatewayUrl="https://gw" group={group} actions={bundle} onApplied={onApplied} />);
      await user.click(screen.getByText("Reset offsets"));
      await user.click(screen.getByRole("button", { name: "Preview" }));
      if (stage === "apply") await user.click(await screen.findByRole("button", { name: "Apply reset" }));
      expect((await screen.findByRole("alert")).textContent).toMatch(message);
      expect(onApplied).not.toHaveBeenCalled();
      unmount();
    }
  });

  it("says when a group has no topics to reset", () => {
    render(<OffsetResetPreview gatewayUrl="https://gw" group={{ ...group, topics: [] }} actions={actions()} onApplied={vi.fn()} />);
    expect(screen.getByText("This group has no committed topics to reset.")).toBeDefined();
  });
});
