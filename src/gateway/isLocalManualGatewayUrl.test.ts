import { describe, expect, it } from "vitest";
import { isLocalManualGatewayUrl } from "./isLocalManualGatewayUrl";

describe("isLocalManualGatewayUrl", () => {
  const origin = "http://localhost:5173";

  it("only enables the two exact local test routes for the explicit local origin", () => {
    expect(isLocalManualGatewayUrl(`${origin}/manual/gateways/a`, origin)).toBe(true);
    expect(isLocalManualGatewayUrl(`${origin}/manual/gateways/b`, origin)).toBe(true);
    expect(isLocalManualGatewayUrl(`${origin}/manual/gateways/a`)).toBe(false);
    expect(isLocalManualGatewayUrl(`${origin}/manual/gateways/a`, "http://127.0.0.1:5173")).toBe(false);
  });

  it("rejects other origins, paths, credentials, queries and fragments", () => {
    for (const url of [
      "http://127.0.0.1:5173/manual/gateways/a",
      "https://localhost:5173/manual/gateways/a",
      "http://localhost:5174/manual/gateways/a",
      "http://attacker.example:5173/manual/gateways/a",
      "http://localhost:5173/manual/gateways/a/extra",
      "http://localhost:5173/manual/gateways/c",
      "http://localhost:5173/manual/gateways/a?x=1",
      "http://localhost:5173/manual/gateways/a?",
      "http://localhost:5173/manual/gateways/a#",
      "http://user@localhost:5173/manual/gateways/a",
      "invalid",
    ]) {
      expect(isLocalManualGatewayUrl(url, origin)).toBe(false);
    }
  });
});
