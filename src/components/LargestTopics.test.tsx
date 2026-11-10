import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LargestTopics } from "./LargestTopics";

describe("LargestTopics", () => {
  it("lists topics in the order the Gateway sorted them, with readable sizes", () => {
    render(<LargestTopics largestTopics={{ topics: [{ topic: "orders", bytes: 2048 }, { topic: "__consumer_offsets", bytes: 12 }] }} />);
    const rows = within(screen.getByRole("table", { name: "Largest topics" })).getAllByRole("row").slice(1);
    expect(rows.map((row) => row.textContent)).toEqual(["orders2.0 KB", "__consumer_offsets12 B"]);
  });

  it("shows an unavailable section", () => {
    render(<LargestTopics largestTopics={{ error: "describe log directories: denied", topics: [] }} />);
    expect(screen.getByRole("alert").textContent).toBe("Unavailable: describe log directories: denied");
    expect(screen.queryByText("No topic data on disk.")).toBeNull();
  });
});
