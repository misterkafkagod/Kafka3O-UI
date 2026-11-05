import { describe, expect, it } from "vitest";
import { secureGatewayUrl } from "./secureGatewayUrl";

describe("secureGatewayUrl", () => {
  it("normalizes HTTPS gateway URLs", () => {
    expect(secureGatewayUrl("https://Gateway.example:443/base/")).toBe("https://gateway.example/base");
  });

  it("rejects insecure, malformed, credentialed, query and fragment URLs", () => {
    for (const url of ["http://localhost:8081", "invalid", "https://u:p@example.com", "https://example.com/?token=x", "https://example.com/#fragment"]) {
      expect(() => secureGatewayUrl(url)).toThrow(/Gateway URL/);
    }
  });
});
