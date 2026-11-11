import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QuorumHealth } from "./QuorumHealth";

describe("QuorumHealth", () => {
  it("shows the leader and each replica's lag", () => {
    render(<QuorumHealth quorum={{ leaderId: 1, leaderEpoch: 3, highWatermark: 894587, replicas: [
      { id: 1, role: "voter", logEndOffset: 894587, lag: 0, lastFetch: "2026-11-11T03:57:06Z", lastCaughtUp: "2026-11-11T03:57:06Z" },
      { id: 2, role: "voter", logEndOffset: 894487, lag: 100, lastFetch: null, lastCaughtUp: null },
      { id: 4, role: "observer", logEndOffset: 5, lag: null, lastFetch: null, lastCaughtUp: null },
    ] }} />);
    const table = screen.getByRole("table", { name: "Controller quorum replicas" });
    const rows = within(table).getAllByRole("row").slice(1).map((row) => [...row.children].map((cell) => cell.textContent));
    expect(rows).toEqual([
      ["1 (leader)", "Voter", "894587", "0", new Date("2026-11-11T03:57:06Z").toLocaleString()],
      ["2", "Voter", "894487", "100", "Unknown"],
      ["4", "Observer", "5", "Unknown", "Unknown"],
    ]);
    expect(screen.getByText("Leader").nextElementSibling?.textContent).toBe("1");
    expect(screen.getByText("High watermark").nextElementSibling?.textContent).toBe("894587");
  });

  it("says when there is no leader", () => {
    render(<QuorumHealth quorum={{ leaderId: null, leaderEpoch: 4, highWatermark: 0, replicas: [] }} />);
    expect(screen.getByText("Leader").nextElementSibling?.textContent).toBe("None");
  });

  it("says why the quorum is unavailable", () => {
    render(<QuorumHealth quorum={{ error: "describe quorum: CLUSTER_AUTHORIZATION_FAILED", leaderId: null, leaderEpoch: 0, highWatermark: 0, replicas: [] }} />);
    expect(screen.getByRole("alert").textContent).toBe("Unavailable: describe quorum: CLUSTER_AUTHORIZATION_FAILED");
    expect(screen.queryByRole("table")).toBeNull();
  });
});
