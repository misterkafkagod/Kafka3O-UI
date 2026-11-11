import { describe, expect, it, vi } from "vitest";
import type { FetchGatewayWrite } from "./GatewayWriteRequest";
import { startBackup } from "./startBackup";

describe("startBackup", () => {
  it("posts the topic and returns the backup", async () => {
    const write = vi.fn<FetchGatewayWrite>().mockResolvedValue({ topic: "orders", connector: "kafka3o-backup-orders", location: "s3://b/kafka-a/orders/" });
    await expect(startBackup(write, "https://gw/", "orders")).resolves.toEqual({ topic: "orders", connector: "kafka3o-backup-orders", location: "s3://b/kafka-a/orders/" });
    expect(write).toHaveBeenCalledWith("https://gw/api/v1/backups", { method: "POST", body: JSON.stringify({ topic: "orders" }) });
  });

  it("rejects a response for another topic", async () => {
    const write = vi.fn<FetchGatewayWrite>().mockResolvedValue({ topic: "other", location: "s3://x/" });
    await expect(startBackup(write, "https://gw", "orders")).rejects.toThrow("invalid backup response");
  });

  it("sends chosen settings", async () => {
    const write = vi.fn<FetchGatewayWrite>().mockResolvedValue({ topic: "orders", connector: "kafka3o-backup-orders", location: "s3://b/kafka-a/orders/" });
    await startBackup(write, "https://gw", "orders", { startFrom: "latest", compression: "zstd", recordsPerFile: 100 });
    expect(write).toHaveBeenCalledWith("https://gw/api/v1/backups", { method: "POST",
      body: JSON.stringify({ topic: "orders", settings: { startFrom: "latest", compression: "zstd", recordsPerFile: 100 } }) });
  });
});
