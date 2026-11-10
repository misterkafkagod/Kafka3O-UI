import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ConsumerGroup } from "../gateway/types";
import { ConsumerGroupTopicOffsets } from "./ConsumerGroupTopicOffsets";

const group: ConsumerGroup = {
  id: "g", protocol: "classic", state: "Empty", members: [], topics: ["orders", "audit"],
  partitions: [
    { topic: "orders", partition: 1, committedOffset: null, startOffset: "0", endOffset: "4", lag: null, status: "no_commit" },
    { topic: "audit", partition: 0, committedOffset: "1", startOffset: "0", endOffset: "2", lag: "1", status: "ok" },
    { topic: "orders", partition: 0, committedOffset: "9007199254740993", startOffset: "0", endOffset: "9007199254740995", lag: "2", status: "ok" },
  ],
};

describe("ConsumerGroupTopicOffsets", () => {
  it("shows only this topic's partitions in order with exact offsets and statuses", () => {
    render(<ConsumerGroupTopicOffsets group={group} topic="orders" />);
    const rows = within(screen.getByRole("table", { name: "Offsets for orders" })).getAllByRole("row").slice(1);
    expect(rows.map((row) => within(row).getAllByRole("cell").map((cell) => cell.textContent))).toEqual([
      ["0", "9007199254740993", "0", "9007199254740995", "2", "Available", "—"],
      ["1", "—", "0", "4", "—", "No committed offset", "—"],
    ]);
  });

  it("says when a topic has no partition offsets", () => {
    render(<ConsumerGroupTopicOffsets group={group} topic="payments" />);
    expect(screen.getByText("No partition offsets.")).toBeDefined();
  });
});
