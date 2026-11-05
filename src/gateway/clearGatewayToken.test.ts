import { describe, expect, it, vi } from "vitest";
import { clearGatewayToken } from "./clearGatewayToken";

describe("clearGatewayToken", () => {
  it("removes only the selected gateway token and surfaces storage errors", () => {
    const removeItem = vi.fn();
    clearGatewayToken({ removeItem }, "https://gateway.example/");
    expect(removeItem).toHaveBeenCalledWith("kafka3o:gateway-token:https://gateway.example");
    expect(() => clearGatewayToken({ removeItem: () => { throw new Error("storage blocked"); } }, "https://gateway.example")).toThrow("storage blocked");
  });
});
