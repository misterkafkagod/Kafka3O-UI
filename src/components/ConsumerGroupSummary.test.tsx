import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ConsumerGroup } from "../gateway/types";
import { ConsumerGroupSummary } from "./ConsumerGroupSummary";

describe("ConsumerGroupSummary", () => {
  it("links encoded group names and identifies unknown or incomplete state", () => {
    const groups: ConsumerGroup[] = [
      { id: "reader & west/1", protocol: "classic", state: "", members: [], topics: [], partitions: [], error: "unavailable" },
      { id: "audit", protocol: "consumer", state: "Stable", members: [], topics: [], partitions: [] },
    ];
    render(<ConsumerGroupSummary groups={groups} />);

    const summary = within(screen.getByRole("navigation", { name: "Consumer group summary" }));
    expect(summary.getByText("2 reported groups")).toBeDefined();
    expect(summary.getByRole("link", { name: "reader & west/1" }).getAttribute("href"))
      .toBe("#consumer-group-reader%20%26%20west%2F1");
    expect(summary.getByText("State: Unknown")).toBeDefined();
    expect(summary.getByText("Group data incomplete")).toBeDefined();
    expect(summary.getByText("State: Stable")).toBeDefined();
  });
});
