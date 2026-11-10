import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BrokerDiskUse } from "./BrokerDiskUse";

const cells = () => within(screen.getByRole("table", { name: "Broker disk use" })).getAllByRole("row").slice(1)
  .map((row) => within(row).getAllByRole("cell").map((cell) => cell.textContent));

describe("BrokerDiskUse", () => {
  it("shows total, used, free, % used and Kafka data per broker and directory", () => {
    render(<BrokerDiskUse logDirs={{ dirs: [{ broker: 1, dir: "/var/lib/kafka/data", totalBytes: 100 * 1024 ** 3, usableBytes: 75 * 1024 ** 3, kafkaBytes: 203606 }] }} />);
    expect(cells()).toEqual([["1", "/var/lib/kafka/data", "100.0 GB", "25.0 GB", "75.0 GB", "25.0%", "198.8 KB"]]);
  });

  it("reads Unknown for unreported sizes, never 0", () => {
    render(<BrokerDiskUse logDirs={{ dirs: [{ broker: 2, dir: "/data", totalBytes: null, usableBytes: null, kafkaBytes: 0 }] }} />);
    expect(cells()).toEqual([["2", "/data", "Unknown", "Unknown", "Unknown", "Unknown", "0 B"]]);
  });

  it("shows a directory error and a section error as unavailable", () => {
    render(<BrokerDiskUse logDirs={{ error: "describe log directories: broker 2 unreachable", dirs: [{ broker: 1, dir: "/data", totalBytes: null, usableBytes: null, kafkaBytes: 0, error: "KAFKA_STORAGE_ERROR" }] }} />);
    expect(screen.getByRole("alert").textContent).toBe("Unavailable: describe log directories: broker 2 unreachable");
    expect(cells()).toEqual([["1", "/data", "Unavailable: KAFKA_STORAGE_ERROR"]]);
  });

  it("shows only the error when nothing was read", () => {
    render(<BrokerDiskUse logDirs={{ error: "CLUSTER_AUTHORIZATION_FAILED", dirs: [] }} />);
    expect(screen.getByRole("alert").textContent).toBe("Unavailable: CLUSTER_AUTHORIZATION_FAILED");
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByText("No log directories reported.")).toBeNull();
  });
});
