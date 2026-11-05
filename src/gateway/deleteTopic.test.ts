import { describe, expect, it, vi } from "vitest";
import type { FetchGatewayWrite } from "./GatewayWriteRequest";
import { deleteTopic } from "./deleteTopic";

describe("deleteTopic", () => {
  it("requests deletion with an encoded topic name", async () => {
    const fetchWrite = vi.fn<FetchGatewayWrite>(async () => ({ name: "orders & audit", status: "accepted" }));
    await expect(deleteTopic(fetchWrite, "https://gateway/", "orders & audit")).resolves.toBeUndefined();
    expect(fetchWrite).toHaveBeenCalledWith("https://gateway/api/v1/topics/orders%20%26%20audit", { method: "DELETE" });
  });
  it("does not retry or accept a malformed acknowledgement", async () => {
    const fetchWrite = vi.fn<FetchGatewayWrite>(async () => ({ name: "other", status: "accepted" }));
    await expect(deleteTopic(fetchWrite, "https://gateway", "orders")).rejects.toThrow("invalid topic deletion response");
    expect(fetchWrite).toHaveBeenCalledTimes(1);
  });
});
