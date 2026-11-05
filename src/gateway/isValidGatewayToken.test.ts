import { describe, expect, it } from "vitest";
import { isValidGatewayToken } from "./isValidGatewayToken";

describe("isValidGatewayToken", () => {
  it("requires at least 32 bearer-token characters", () => {
    expect(isValidGatewayToken("a".repeat(32))).toBe(true);
    expect(isValidGatewayToken("short")).toBe(false);
    expect(isValidGatewayToken(`${"a".repeat(32)} with spaces`)).toBe(false);
  });
});
