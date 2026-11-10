import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ConsumerGroup } from "../gateway/types";
import { renderWithQuery } from "../test/renderWithQuery";
import { ConsumerGroupDetails } from "./ConsumerGroupDetails";

const group: ConsumerGroup = {
  id: "orders-group", protocol: "classic", state: "Stable",
  members: [{ id: "member-1", clientId: "client-1", clientHost: "host-1", instanceId: "instance-1" }],
  topics: ["orders"],
  partitions: [
    { topic: "orders", partition: 0, committedOffset: "9007199254740993", startOffset: "0", endOffset: "9007199254740995", lag: "2", status: "ok" },
    { topic: "orders", partition: 1, committedOffset: null, startOffset: "0", endOffset: "4", lag: null, status: "no_commit" },
    { topic: "orders", partition: 2, committedOffset: "1", startOffset: "3", endOffset: "9", lag: null, status: "out_of_range" },
    { topic: "orders", partition: 3, committedOffset: null, startOffset: null, endOffset: null, lag: null, status: "unavailable", error: "access denied" },
  ],
};

describe("ConsumerGroupDetails", () => {
  it("shows members, exact offsets and distinct lag statuses", () => {
    renderWithQuery(<ConsumerGroupDetails group={group} onRetry={() => {}} />);

    expect(screen.getByText("State: Stable · Protocol: classic")).toBeDefined();
    const members = screen.getByRole("region", { name: "Members of orders-group table scroll area" });
    expect(within(within(members).getByRole("table", { name: "Members of orders-group" })).getByText("instance-1")).toBeDefined();
    const lag = screen.getByRole("region", { name: "Partition lag for orders-group table scroll area" });
    const table = within(lag).getByRole("table", { name: "Partition lag for orders-group" });
    const [, body] = within(table).getAllByRole("rowgroup");
    const rows = within(body).getAllByRole("row").map((row) =>
      within(row).getAllByRole("cell").map((cell) => cell.textContent),
    );
    expect(rows).toEqual([
      ["orders", "0", "9007199254740993", "0", "9007199254740995", "2", "Available", "—"],
      ["orders", "1", "—", "0", "4", "—", "No committed offset", "—"],
      ["orders", "2", "1", "3", "9", "—", "Commit outside log range", "—"],
      ["orders", "3", "—", "—", "—", "—", "Unavailable", "access denied"],
    ]);
  });

  it("identifies incomplete group data without claiming members or lag are absent", async () => {
    const retry = vi.fn();
    renderWithQuery(<ConsumerGroupDetails group={{ ...group, members: [], partitions: [], error: "not authorized" }} onRetry={retry} />);

    expect(screen.getByRole("alert").textContent).toContain("not authorized");
    expect(screen.getByText("Member information may be unavailable.")).toBeDefined();
    expect(screen.getByText("Partition lag may be unavailable.")).toBeDefined();
    await userEvent.click(screen.getByRole("button", { name: "Retry group data" }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("offers an offset reset only where it is enabled", () => {
    const { unmount } = renderWithQuery(<ConsumerGroupDetails group={group} onRetry={() => {}} />);
    expect(screen.queryByText("Reset offsets")).toBeNull();
    unmount();
    renderWithQuery(<ConsumerGroupDetails group={group} onRetry={() => {}} offsetReset={{ gatewayUrl: "https://gw", actions: { preview: vi.fn(), apply: vi.fn(), confirm: vi.fn() } }} />);
    expect(screen.getByText("Reset offsets")).toBeDefined();
  });
});
