import { describe, expect, it } from "vitest";
import { metricsFileName } from "./metricsFileName";

describe("metricsFileName", () => {
  it("uses the cluster and the UTC read time without characters file systems reject", () => {
    expect(metricsFileName("kafka-a", "2026-11-10T13:00:00+01:00", "csv")).toBe("kafka-a-metrics-2026-11-10T12-00-00Z.csv");
    expect(metricsFileName("dev / west", "2026-11-10T12:00:00.123Z", "json")).toBe("dev___west-metrics-2026-11-10T12-00-00Z.json");
  });
});
