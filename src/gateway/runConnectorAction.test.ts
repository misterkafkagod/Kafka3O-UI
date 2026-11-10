import { describe, expect, it, vi } from "vitest";
import type { FetchGatewayWrite } from "./GatewayWriteRequest";
import { runConnectorAction } from "./runConnectorAction";

describe("runConnectorAction", () => {
  it("posts each action to its Gateway route", async () => {
    const write = vi.fn<FetchGatewayWrite>().mockResolvedValue({});
    await runConnectorAction(write, "https://gw/", { kind: "pause", connector: "orders sink" });
    await runConnectorAction(write, "https://gw", { kind: "resume", connector: "orders-sink" });
    await runConnectorAction(write, "https://gw", { kind: "restart", connector: "orders-sink" });
    await runConnectorAction(write, "https://gw", { kind: "restart-task", connector: "orders-sink", task: 2 });
    expect(write.mock.calls).toEqual([
      ["https://gw/api/v1/connect/connectors/orders%20sink/pause", { method: "POST" }],
      ["https://gw/api/v1/connect/connectors/orders-sink/resume", { method: "POST" }],
      ["https://gw/api/v1/connect/connectors/orders-sink/restart", { method: "POST" }],
      ["https://gw/api/v1/connect/connectors/orders-sink/tasks/2/restart", { method: "POST" }],
    ]);
  });
});
