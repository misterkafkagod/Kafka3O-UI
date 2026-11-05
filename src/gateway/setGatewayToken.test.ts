import { describe, expect, it, vi } from "vitest";
import { setGatewayToken } from "./setGatewayToken";

describe("setGatewayToken", () => {
  it("stores a valid token in the selected HTTPS gateway's session key", () => {
    const setItem = vi.fn();
    setGatewayToken({ setItem }, "https://gateway.example/", "a".repeat(32), true);
    expect(setItem).toHaveBeenCalledWith("kafka3o:gateway-token:https://gateway.example", "a".repeat(32));
  });

  it("rejects insecure contexts, invalid tokens, HTTP and storage errors", () => {
    const setItem = vi.fn();
    expect(() => setGatewayToken({ setItem }, "https://gateway.example", "a".repeat(32), false)).toThrow(/HTTPS/);
    expect(() => setGatewayToken({ setItem }, "https://gateway.example", "short", true)).toThrow(/32/);
    expect(() => setGatewayToken({ setItem }, "http://gateway.example", "a".repeat(32), true)).toThrow(/HTTPS/);
    expect(setItem).not.toHaveBeenCalled();
    expect(() => setGatewayToken({ setItem: () => { throw new Error("storage blocked"); } }, "https://gateway.example", "a".repeat(32), true)).toThrow("storage blocked");
  });
});
