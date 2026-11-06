import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ScrollableTableRegion } from "./ScrollableTableRegion";

describe("ScrollableTableRegion", () => {
  it("provides a named, keyboard-focusable region without changing table semantics", async () => {
    const user = userEvent.setup();
    render(
      <ScrollableTableRegion label="Brokers table scroll area">
        <table aria-label="Brokers">
          <tbody><tr><td>broker-1</td></tr></tbody>
        </table>
      </ScrollableTableRegion>,
    );

    const region = screen.getByRole("region", { name: "Brokers table scroll area" });
    expect(within(region).getByRole("table", { name: "Brokers" })).toBeDefined();
    expect(within(region).getByRole("cell", { name: "broker-1" })).toBeDefined();
    await user.tab();
    expect(document.activeElement).toBe(region);
  });
});
