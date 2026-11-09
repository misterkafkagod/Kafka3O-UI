import { describe, expect, it } from "vitest";
import { pickAllowed } from "./pickAllowed";

describe("pickAllowed", () => {
  it("returns allowed values and falls back otherwise", () => {
    expect(pickAllowed(["a", "b"] as const, "b", "a")).toBe("b");
    expect(pickAllowed(["a", "b"] as const, "c", "a")).toBe("a");
    expect(pickAllowed(["a", "b"] as const, 1, "a")).toBe("a");
  });
});
