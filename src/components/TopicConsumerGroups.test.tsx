import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ConsumerGroup } from "../gateway/types";
import { renderWithQuery } from "../test/renderWithQuery";
import { TopicConsumerGroups } from "./TopicConsumerGroups";

const gateway = { id: "dev", name: "Dev", url: "http://localhost:8081" };
const reader: ConsumerGroup = {
  id: "reader", protocol: "classic", state: "Stable", members: [], topics: ["orders", "audit"],
  partitions: [
    { topic: "orders", partition: 0, committedOffset: "1", startOffset: "0", endOffset: "5", lag: "4", status: "ok" },
    { topic: "audit", partition: 2, committedOffset: "1", startOffset: "0", endOffset: "3", lag: "2", status: "ok" },
  ],
};

describe("TopicConsumerGroups", () => {
  it("announces loading without claiming the topic has no groups", () => {
    renderWithQuery(<TopicConsumerGroups gateway={gateway} topicName="orders" listConsumerGroups={() => new Promise<never>(() => {})} />);

    expect(screen.getByRole("status").textContent).toBe("Loading consumer groups…");
    expect(screen.queryByText("No consumer groups for this topic.")).toBeNull();
  });

  it("shows only associated groups and this topic's partition rows", async () => {
    const other = { ...reader, id: "other", topics: ["audit"] };
    const list = vi.fn(async () => [reader, other]);
    renderWithQuery(<TopicConsumerGroups gateway={gateway} topicName="orders" listConsumerGroups={list} />);

    const table = await screen.findByRole("table", { name: "Partition lag for reader" });
    expect(within(table).getByText("orders")).toBeDefined();
    expect(within(table).queryByText("audit")).toBeNull();
    expect(screen.queryByRole("heading", { name: "other" })).toBeNull();
    expect(list).toHaveBeenCalledWith(gateway.url);
  });

  it("distinguishes no groups from unresolved associations", async () => {
    const first = renderWithQuery(<TopicConsumerGroups gateway={gateway} topicName="orders" listConsumerGroups={async () => []} />);
    expect(await screen.findByText("No consumer groups for this topic.")).toBeDefined();
    first.unmount();

    const unresolved = { ...reader, id: "unknown", topics: ["audit"], error: "group access denied" };
    renderWithQuery(<TopicConsumerGroups gateway={gateway} topicName="orders" listConsumerGroups={async () => [unresolved]} />);
    expect(await screen.findByText("No known consumer groups for this topic.")).toBeDefined();
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain('Could not determine whether group "unknown" consumes this topic');
    expect(alert.textContent).toContain("group access denied");
    expect(screen.queryByRole("heading", { name: "unknown" })).toBeNull();
  });

  it("shows known group errors and retries gateway failures", async () => {
    const failed = { ...reader, error: "partial offsets" };
    const list = vi.fn().mockRejectedValueOnce(new TypeError("Failed to fetch")).mockResolvedValueOnce([failed]);
    renderWithQuery(<TopicConsumerGroups gateway={gateway} topicName="orders" listConsumerGroups={list} />);

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("Gateway unreachable")).toBeDefined();
    await userEvent.click(within(alert).getByRole("button", { name: "Retry" }));
    expect((await screen.findByRole("alert")).textContent).toContain("partial offsets");
    expect(await screen.findByRole("table", { name: "Partition lag for reader" })).toBeDefined();
  });
});
