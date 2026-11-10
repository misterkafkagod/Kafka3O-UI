import { describe, expect, it, vi } from "vitest";
import { applyOffsetReset } from "./applyOffsetReset";
import type { FetchGatewayWrite } from "./GatewayWriteRequest";

const preview = {
  group: "team/billing", topic: "orders",
  partitions: [{ partition: 0, currentOffset: "9007199254740993", targetOffset: "2" }, { partition: 1, currentOffset: null, targetOffset: "3" }],
};

describe("applyOffsetReset", () => {
  it("posts the previewed targets with the offsets the preview saw", async () => {
    const write = vi.fn<FetchGatewayWrite>().mockResolvedValue({ group: "team/billing", topic: "orders", partitions: [{ partition: 0, committedOffset: "2" }] });
    const result = await applyOffsetReset(write, "https://gw/", preview);
    const [url, request] = write.mock.calls[0];
    expect(url).toBe("https://gw/api/v1/consumer-groups/team%2Fbilling/offset-reset");
    expect(request.method).toBe("POST");
    expect(JSON.parse(request.body!)).toEqual({ topic: "orders", partitions: [
      { partition: 0, expectedOffset: "9007199254740993", targetOffset: "2" },
      { partition: 1, expectedOffset: null, targetOffset: "3" },
    ] });
    expect(result.partitions).toEqual([{ partition: 0, committedOffset: "2" }]);
  });

  it("rejects a response for another group or topic", async () => {
    const write = vi.fn<FetchGatewayWrite>().mockResolvedValue({ group: "other", topic: "orders", partitions: [] });
    await expect(applyOffsetReset(write, "https://gw", preview)).rejects.toThrow("invalid offset reset response");
  });
});
