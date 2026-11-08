import { describe, expect, it } from "vitest";
import { parseAccessListing } from "./parseAccessListing";

const valid = {
  operationId: "op", policyRevision: 3, nextCursor: "", groupGrantsTruncated: false,
  identities: [{ id: "alice", source: "local", label: "alice", enabled: true, grants: [{ clusterId: "", role: "VIEWER" }, { clusterId: "prod", role: "ADMIN" }] }],
  groupGrants: [{ issuer: "https://issuer.example", group: "Ops", clusterId: "dev", role: "OPERATOR" }],
};

describe("parseAccessListing", () => {
  it("returns identities, grants and group mappings", () => {
    expect(parseAccessListing(valid)).toEqual(valid);
  });

  it("rejects unknown roles, sources and malformed entries", () => {
    for (const bad of [
      null, [], { ...valid, policyRevision: 1.5 }, { ...valid, identities: {} },
      { ...valid, identities: [{ ...valid.identities[0], source: "email" }] },
      { ...valid, identities: [{ ...valid.identities[0], grants: [{ clusterId: "", role: "OWNER" }] }] },
      { ...valid, identities: [{ ...valid.identities[0], grants: [{ clusterId: "", role: "" }] }] },
      { ...valid, groupGrants: [{ ...valid.groupGrants[0], group: 7 }] },
      { ...valid, groupGrantsTruncated: "no" },
    ]) {
      expect(() => parseAccessListing(bad)).toThrow(expect.objectContaining({ code: "invalid_response" }));
    }
  });
});
