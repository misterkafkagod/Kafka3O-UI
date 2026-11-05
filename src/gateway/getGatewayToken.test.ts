import { describe, expect, it } from "vitest";
import { getGatewayToken } from "./getGatewayToken";

describe("getGatewayToken", () => {
  it("reads only the selected gateway and surfaces storage errors", () => {
    const storage = { getItem: (key: string) => key.endsWith("https://one.example") ? "first" : null };
    expect(getGatewayToken(storage, "https://one.example/")).toBe("first");
    expect(getGatewayToken(storage, "https://two.example")).toBeNull();
    expect(() => getGatewayToken({ getItem: () => { throw new Error("storage blocked"); } }, "https://one.example")).toThrow("storage blocked");
  });
});
