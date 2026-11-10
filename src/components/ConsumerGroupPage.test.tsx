import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { OffsetResetActions } from "../gateway/OffsetResetActions";
import type { ConsumerGroup } from "../gateway/types";
import { renderWithQuery } from "../test/renderWithQuery";
import { ConsumerGroupPage } from "./ConsumerGroupPage";

const gateway = { id: "dev a", name: "Dev", url: "http://localhost:8081" };
const group: ConsumerGroup = {
  id: "reader & west/1", protocol: "classic", state: "Empty", members: [], topics: ["orders", "audit"],
  partitions: [
    { topic: "orders", partition: 0, committedOffset: "9007199254740993", startOffset: "0", endOffset: "9007199254740995", lag: "2", status: "ok" },
    { topic: "audit", partition: 0, committedOffset: null, startOffset: "0", endOffset: "3", lag: null, status: "no_commit" },
  ],
};
const resetActions: OffsetResetActions = { preview: vi.fn(), apply: vi.fn(), confirm: vi.fn(() => true) };

describe("ConsumerGroupPage", () => {
  it("shows the group's members, one offsets table per topic and the offset reset", async () => {
    renderWithQuery(<ConsumerGroupPage gateway={gateway} groupId={group.id} listConsumerGroups={async () => [group]} offsetReset={resetActions} />);

    expect(await screen.findByText("State: Empty · Protocol: classic")).toBeDefined();
    expect(screen.getByText("No active members.")).toBeDefined();
    expect(screen.getAllByRole("heading", { level: 4 }).map((heading) => heading.textContent)).toEqual(["audit", "orders"]);
    expect(within(screen.getByRole("table", { name: "Offsets for orders" })).getByText("9007199254740993")).toBeDefined();
    expect(within(screen.getByRole("table", { name: "Offsets for audit" })).getByText("No committed offset")).toBeDefined();
    expect(screen.getByText("Reset offsets")).toBeDefined();
    expect(screen.getByRole("link", { name: "Back to consumer groups" }).getAttribute("href")).toBe("/clusters/dev%20a/consumer-groups");
  });

  it("says when the group is not reported", async () => {
    renderWithQuery(<ConsumerGroupPage gateway={gateway} groupId="missing" listConsumerGroups={async () => [group]} />);

    expect(await screen.findByText(/Consumer group not found/)).toBeDefined();
    expect(screen.getByRole("link", { name: "Show all consumer groups" }).getAttribute("href")).toBe("/clusters/dev%20a/consumer-groups");
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("shows a group error with retry and no invented rows", async () => {
    const list = vi.fn()
      .mockResolvedValueOnce([{ ...group, topics: [], partitions: [], error: "describe failed" }])
      .mockResolvedValueOnce([group]);
    renderWithQuery(<ConsumerGroupPage gateway={gateway} groupId={group.id} listConsumerGroups={list} />);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("describe failed");
    expect(screen.getByText("Partition offsets may be unavailable.")).toBeDefined();
    expect(screen.queryByRole("table")).toBeNull();
    await userEvent.click(within(alert).getByRole("button", { name: "Retry group data" }));
    expect(await screen.findByRole("table", { name: "Offsets for orders" })).toBeDefined();
  });

  it("shows Gateway errors with retry", async () => {
    const list = vi.fn().mockRejectedValueOnce(new TypeError("Failed to fetch")).mockResolvedValueOnce([group]);
    renderWithQuery(<ConsumerGroupPage gateway={gateway} groupId={group.id} listConsumerGroups={list} />);

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("Gateway unreachable")).toBeDefined();
    await userEvent.click(within(alert).getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("table", { name: "Offsets for orders" })).toBeDefined();
  });
});
