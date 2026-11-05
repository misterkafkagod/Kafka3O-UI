import { describe, expect, it, vi } from "vitest";
import type { FetchGatewayWrite } from "./GatewayWriteRequest";
import { createTopic } from "./createTopic";

describe("createTopic", () => {
  const input = { name: "orders", partitions: 3, replicationFactor: 2 };
  it("posts explicit topic parameters and checks the acknowledgement", async () => {
    const fetchWrite = vi.fn<FetchGatewayWrite>(async () => input);
    await expect(createTopic(fetchWrite, "https://gateway/", input)).resolves.toBeUndefined();
    expect(fetchWrite).toHaveBeenCalledWith("https://gateway/api/v1/topics", { method: "POST", body: JSON.stringify(input) });
  });
  it("does not retry or accept a malformed acknowledgement", async () => {
    const fetchWrite = vi.fn<FetchGatewayWrite>(async () => ({ ...input, name: "other" }));
    await expect(createTopic(fetchWrite, "https://gateway", input)).rejects.toThrow("invalid topic creation response");
    expect(fetchWrite).toHaveBeenCalledTimes(1);
  });
});
