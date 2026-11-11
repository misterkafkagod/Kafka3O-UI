import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BrokerLeaders } from "./BrokerLeaders";

describe("BrokerLeaders", () => {
  it("shows leaders, replicas and non-preferred leaders per broker", () => {
    render(<BrokerLeaders brokers={{ brokers: [{ broker: 1, leaders: 2, replicas: 3, nonPreferredLeaders: 1 }, { broker: 4, leaders: 0, replicas: 0, nonPreferredLeaders: 0 }] }} />);
    const rows = within(screen.getByRole("table", { name: "Partition leaders per broker" })).getAllByRole("row").slice(1)
      .map((row) => [...row.children].map((cell) => cell.textContent));
    expect(rows).toEqual([["1", "2", "3", "1"], ["4", "0", "0", "0"]]);
  });

  it("says why the brokers are unavailable", () => {
    render(<BrokerLeaders brokers={{ error: "read metadata: timeout", brokers: [] }} />);
    expect(screen.getByRole("alert").textContent).toBe("Unavailable: read metadata: timeout");
  });
});
