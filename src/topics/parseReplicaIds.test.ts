import { describe, expect, it } from "vitest";
import { parseReplicaIds } from "./parseReplicaIds";

describe("parseReplicaIds", () => {
  it("preserves the requested broker order", () => {
    expect(parseReplicaIds(" 3, 1, 2 ", [1, 2, 3])).toEqual([3, 1, 2]);
    expect(parseReplicaIds("0, 2147483647", [0, 2147483647])).toEqual([0, 2147483647]);
  });

  it("rejects empty, duplicate, unknown and out-of-range IDs", () => {
    for (const text of ["", " ", "1,", "-1", "1.0", "1, 01", "2", "2147483648"]) {
      expect(parseReplicaIds(text, [1, 2147483648])).toBeNull();
    }
  });
});
