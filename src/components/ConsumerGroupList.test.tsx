import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ConsumerGroup, ConsumerGroupPartition } from "../gateway/types";
import { ConsumerGroupList } from "./ConsumerGroupList";

const partition: ConsumerGroupPartition = { topic: "orders", partition: 0, committedOffset: "1", startOffset: "0", endOffset: "4", lag: "3", status: "ok" };
const member = { id: "m-1", clientId: "c", clientHost: "/10.0.0.1" };
const groups: ConsumerGroup[] = [
  { id: "zeta", protocol: "classic", state: "Stable", members: [member, { ...member, id: "m-2" }], topics: ["orders"], partitions: [partition, { ...partition, partition: 1, lag: "5" }] },
  { id: "alpha", protocol: "consumer", state: "Empty", members: [], topics: ["orders", "payments"], partitions: [partition, { ...partition, partition: 1, lag: null, status: "no_commit" }] },
  { id: "idle", protocol: "classic", state: "", members: [], topics: [], partitions: [], error: "describe failed" },
];

describe("ConsumerGroupList", () => {
  it("lists every group sorted by name with state, members, topics and total lag", () => {
    render(<ConsumerGroupList groups={groups} />);
    const rows = within(screen.getByRole("table", { name: "Consumer groups" })).getAllByRole("row").slice(1);
    expect(rows.map((row) => within(row).getAllByRole("cell").map((cell) => cell.textContent))).toEqual([
      ["Empty", "0", "2", "Unknown (1 partition)"],
      ["Unknown", "0", "0", "—"],
      ["Stable", "2", "1", "8"],
    ]);
    expect(rows.map((row) => within(row).getByRole("link").textContent)).toEqual(["alpha", "idle", "zeta"]);
  });

  it("marks incomplete groups and links each name to its details", () => {
    render(<ConsumerGroupList groups={[{ ...groups[2], id: "reader & west/1" }]} />);
    expect(screen.getByText("Group data incomplete")).toBeDefined();
    expect(screen.getByRole("link", { name: "reader & west/1" }).getAttribute("href")).toBe(`#${encodeURIComponent("consumer-group-reader & west/1")}`);
  });
});
