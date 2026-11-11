import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithQuery } from "../test/renderWithQuery";
import { ConsumerGroupMetrics } from "./ConsumerGroupMetrics";

describe("ConsumerGroupMetrics", () => {
  it("shows state counts and each group's lag, linking to the group", () => {
    renderWithQuery(<ConsumerGroupMetrics gatewayId="kafka-a" consumerGroups={{ states: [{ state: "Empty", count: 2 }, { state: "Stable", count: 1 }], groups: [
      { group: "orders", state: "Stable", members: 2, lag: "9007199254740993", maxPartitionLag: "9007199254740990", unknownPartitions: 0 },
      { group: "partial", state: "Empty", members: 0, lag: "3", maxPartitionLag: "3", unknownPartitions: 2 },
      { group: "unknown", state: "Empty", members: 0, lag: null, maxPartitionLag: null, unknownPartitions: 1 },
      { group: "broken", state: "Dead", members: 0, lag: null, maxPartitionLag: null, unknownPartitions: 0, error: "COORDINATOR_NOT_AVAILABLE" },
    ] }} />);
    expect(screen.getByText("Empty", { selector: "dt" }).nextElementSibling?.textContent).toBe("2");
    const rows = within(screen.getByRole("table", { name: "Consumer group lag" })).getAllByRole("row").slice(1)
      .map((row) => [...row.children].map((cell) => cell.textContent));
    expect(rows).toEqual([
      ["orders", "Stable", "2", "9007199254740993", "9007199254740990"],
      ["partial", "Empty", "0", "At least 3 (2 partitions unknown)", "3"],
      ["unknown", "Empty", "0", "Unknown (1 partition)", ""],
      ["broken", "Dead", "0", "Unavailable: COORDINATOR_NOT_AVAILABLE", ""],
    ]);
    expect(screen.getByRole("link", { name: "orders" }).getAttribute("href")).toBe("/clusters/kafka-a/consumer-groups/orders");
  });

  it("says when there are no groups or the read failed", () => {
    const { unmount } = renderWithQuery(<ConsumerGroupMetrics gatewayId="kafka-a" consumerGroups={{ states: [], groups: [] }} />);
    expect(screen.getByText("No consumer groups.")).toBeDefined();
    unmount();
    renderWithQuery(<ConsumerGroupMetrics gatewayId="kafka-a" consumerGroups={{ error: "list groups: timeout", states: [], groups: [] }} />);
    expect(screen.getByRole("alert").textContent).toBe("Unavailable: list groups: timeout");
  });
});
