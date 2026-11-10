import { describe, expect, it, vi } from "vitest";
import type { FetchGatewayWrite } from "./GatewayWriteRequest";
import { runBackupAction } from "./runBackupAction";

describe("runBackupAction", () => {
  it("sends each action to its Gateway route", async () => {
    const write = vi.fn<FetchGatewayWrite>().mockResolvedValue({});
    await runBackupAction(write, "https://gw/", "orders.v2", "pause");
    await runBackupAction(write, "https://gw", "orders.v2", "resume");
    await runBackupAction(write, "https://gw", "orders.v2", "delete");
    expect(write.mock.calls).toEqual([
      ["https://gw/api/v1/backups/orders.v2/pause", { method: "POST" }],
      ["https://gw/api/v1/backups/orders.v2/resume", { method: "POST" }],
      ["https://gw/api/v1/backups/orders.v2", { method: "DELETE" }],
    ]);
  });
});
