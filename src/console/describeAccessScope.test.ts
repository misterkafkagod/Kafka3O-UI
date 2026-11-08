import { describe, expect, it } from "vitest";
import { describeAccessScope } from "./describeAccessScope";

const clusters = [
  { id: "prod", name: "Prod", gatewayUrl: "https://prod.example", environment: "PRODUCTION" as const, active: true },
  { id: "old", name: "Old", gatewayUrl: "https://old.example", environment: "" as const, active: false },
];

describe("describeAccessScope", () => {
  it("names global, registered, inactive and unregistered scopes", () => {
    expect(describeAccessScope("", clusters)).toBe("All clusters");
    expect(describeAccessScope("prod", clusters)).toBe("Cluster Prod (prod)");
    expect(describeAccessScope("old", clusters)).toBe("Cluster Old (old), inactive");
    expect(describeAccessScope("gone", clusters)).toBe("Cluster gone (not registered)");
  });
});
