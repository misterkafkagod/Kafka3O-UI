import { describe, expect, it, vi } from "vitest";
import type { FetchGatewayWrite } from "./GatewayWriteRequest";
import { produceTopicMessage } from "./produceTopicMessage";

describe("produceTopicMessage", () => {
  it("sends UTF-8 fields, preserving an empty key and exact offset", async () => {
    const fetchWrite = vi.fn(async () => ({ partition: 2, offset: "9007199254740993" }));
    const message = { value: "café", key: "", headers: [{ key: "source", value: "λ" }] };
    await expect(produceTopicMessage(fetchWrite, "https://gateway/", "orders & audit", message))
      .resolves.toEqual({ partition: 2, offset: "9007199254740993" });
    expect(fetchWrite).toHaveBeenCalledWith(
      "https://gateway/api/v1/topics/orders%20%26%20audit/messages",
      { method: "POST", body: JSON.stringify(message) },
    );
  });

  it("omits an absent key and does not retry failures", async () => {
    const fetchWrite = vi.fn<FetchGatewayWrite>(async () => { throw new TypeError("network"); });
    await expect(produceTopicMessage(fetchWrite, "https://gateway", "orders", { value: "", headers: [] })).rejects.toThrow();
    expect(fetchWrite).toHaveBeenCalledTimes(1);
    expect(fetchWrite.mock.calls[0][1].body).toBe('{"value":"","headers":[]}');
  });

  it.each([
    { partition: -1, offset: "1" },
    { partition: 1.5, offset: "1" },
    { partition: 1, offset: 9007199254740993 },
    { partition: 1, offset: "9223372036854775808" },
    { partition: 1, offset: "01" },
  ])("rejects an invalid acknowledged position %#", async (result) => {
    await expect(produceTopicMessage(async () => result, "https://gateway", "orders", { value: "", headers: [] }))
      .rejects.toThrow("invalid message position");
  });
});
