import { describe, expect, it } from "vitest";
import { parseClusterListing } from "./parseClusterListing";

const valid = {
  operationId: "op", policyRevision: 1,
  clusters: [
    { id: "dev", name: "Dev", gatewayUrl: "https://dev.example", environment: "", active: true },
    { id: "prod", name: "Prod", gatewayUrl: "https://prod.example", environment: "PRODUCTION", active: false },
  ],
};

describe("parseClusterListing", () => {
  it("returns registered clusters with their authoritative environment", () => {
    expect(parseClusterListing(valid)).toEqual(valid);
  });

  it("rejects unknown environments and malformed clusters", () => {
    for (const bad of [
      null, { ...valid, clusters: null },
      { ...valid, clusters: [{ ...valid.clusters[0], environment: "STAGING" }] },
      { ...valid, clusters: [{ ...valid.clusters[0], id: "" }] },
      { ...valid, clusters: [{ ...valid.clusters[0], active: 1 }] },
    ]) {
      expect(() => parseClusterListing(bad)).toThrow(expect.objectContaining({ code: "invalid_response" }));
    }
  });
});
