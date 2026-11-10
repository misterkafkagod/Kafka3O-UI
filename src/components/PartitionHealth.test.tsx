import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ClusterMetrics } from "../gateway/getMetrics";
import { PartitionHealth } from "./PartitionHealth";

const healthy: ClusterMetrics["partitions"] = { topics: 6, partitions: 36, underReplicated: 0, offline: 0, belowMinIsr: 0, unreadableTopics: [] };
const stat = (label: string) => screen.getByText(label, { selector: "dt" }).parentElement!;

describe("PartitionHealth", () => {
  it("shows the counts and marks only non-zero problems", () => {
    render(<PartitionHealth partitions={{ ...healthy, underReplicated: 2, offline: 1 }} />);
    expect(stat("Topics").textContent).toBe("Topics6");
    expect(stat("Partitions").textContent).toBe("Partitions36");
    expect(stat("Under-replicated").className).not.toBe("");
    expect(stat("Offline").textContent).toBe("Offline1");
    expect(stat("Below min ISR").className).toBe("");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("reads Unknown with the reason when min ISR is unreadable, and names unreadable topics", () => {
    render(<PartitionHealth partitions={{ ...healthy, belowMinIsr: null, minIsrError: "read topic configuration: denied", unreadableTopics: ["secret"] }} />);
    expect(stat("Below min ISR").textContent).toBe("Below min ISRUnknown");
    expect(screen.getByText("Below min ISR is unknown: read topic configuration: denied")).toBeDefined();
    expect(screen.getByRole("alert").textContent).toBe("Not counted, because Kafka did not describe them: secret");
  });

  it("shows an unavailable section without counts", () => {
    render(<PartitionHealth partitions={{ ...healthy, error: "read topic metadata: refused" }} />);
    expect(screen.getByRole("alert").textContent).toBe("Unavailable: read topic metadata: refused");
    expect(screen.queryByText("Topics")).toBeNull();
  });
});
