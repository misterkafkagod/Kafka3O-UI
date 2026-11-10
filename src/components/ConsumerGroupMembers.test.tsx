import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ConsumerGroup } from "../gateway/types";
import { ConsumerGroupMembers } from "./ConsumerGroupMembers";

const group: ConsumerGroup = { id: "g", protocol: "classic", state: "Stable", members: [{ id: "m-1", clientId: "client-1", clientHost: "/10.0.0.1" }], topics: [], partitions: [] };

describe("ConsumerGroupMembers", () => {
  it("lists members with a placeholder for a missing instance", () => {
    render(<ConsumerGroupMembers group={group} />);
    const row = within(screen.getByRole("table", { name: "Members of g" })).getAllByRole("row")[1];
    expect(within(row).getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["m-1", "client-1", "/10.0.0.1", "—"]);
  });

  it("distinguishes no members from unavailable member data", () => {
    const { unmount } = render(<ConsumerGroupMembers group={{ ...group, members: [] }} />);
    expect(screen.getByText("No active members.")).toBeDefined();
    unmount();
    render(<ConsumerGroupMembers group={{ ...group, members: [], error: "describe failed" }} />);
    expect(screen.getByText("Member information may be unavailable.")).toBeDefined();
  });
});
