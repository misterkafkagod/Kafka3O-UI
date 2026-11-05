import { describe, expect, it } from "vitest";
import { gatewayTokenKey } from "./gatewayTokenKey";

describe("gatewayTokenKey", () => {
  it("uses a canonical gateway URL without including the token", () => {
    expect(gatewayTokenKey("https://EXAMPLE.com/")).toBe("kafka3o:gateway-token:https://example.com");
    expect(gatewayTokenKey("https://example.com/other")).not.toBe(gatewayTokenKey("https://example.com"));
  });
});
