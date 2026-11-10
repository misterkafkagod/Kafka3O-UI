import { describe, expect, it, vi } from "vitest";
import type { FetchGatewayWrite } from "./GatewayWriteRequest";
import { startRestore } from "./startRestore";

describe("startRestore", () => {
  it("posts to the topic's restore route", async () => {
    const write = vi.fn<FetchGatewayWrite>().mockResolvedValue({ topic: "orders", restoreId: "r-1", objects: 2 });
    await expect(startRestore(write, "https://gw/", "orders")).resolves.toEqual({ topic: "orders", restoreId: "r-1", objects: 2 });
    expect(write).toHaveBeenCalledWith("https://gw/api/v1/backups/orders/restore", { method: "POST" });
  });

  it("rejects a response for another topic", async () => {
    const write = vi.fn<FetchGatewayWrite>().mockResolvedValue({ topic: "other", restoreId: "r-1" });
    await expect(startRestore(write, "https://gw", "orders")).rejects.toThrow("invalid restore response");
  });
});
