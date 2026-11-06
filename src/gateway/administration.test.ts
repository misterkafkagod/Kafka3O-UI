import { describe, expect, it, vi } from "vitest";
import { alterConfiguration } from "./alterConfiguration";
import { describeAdministrationError } from "./describeAdministrationError";
import { getConfigurations } from "./getConfigurations";
import { HttpError } from "./HttpError";
import { increasePartitions } from "./increasePartitions";
import { listReassignments } from "./listReassignments";
import { reassignPartition } from "./reassignPartition";

describe("Kafka administration gateway API", () => {
  it("encodes topic paths and suppresses sensitive and password values", async () => {
    const fetchJson = vi.fn(async () => [
      { name: "retention.ms", value: "60000", sensitive: false, readOnly: false, source: "DYNAMIC_TOPIC_CONFIG", type: "LONG" },
      { name: "secret", value: "must-not-appear", sensitive: true, readOnly: false, source: "DEFAULT_CONFIG", type: "STRING", documentation: "must-not-appear" },
      { name: "password", value: "must-not-appear", sensitive: false, readOnly: false, source: "DEFAULT_CONFIG", type: "PASSWORD" },
    ]);
    const entries = await getConfigurations(fetchJson, "https://gateway.example/", { kind: "topic", name: "orders & audit" });
    expect(fetchJson).toHaveBeenCalledWith("https://gateway.example/api/v1/topics/orders%20%26%20audit/config");
    expect(entries[0].value).toBe("60000");
    expect(entries[1]).toMatchObject({ sensitive: true, value: null, documentation: undefined });
    expect(entries[2]).toMatchObject({ sensitive: true, value: null });
  });

  it("rejects malformed configuration and reassignment responses", async () => {
    await expect(getConfigurations(async () => [{ name: "x" }], "https://gateway.example", { kind: "broker", id: 2 })).rejects.toThrow("invalid configuration");
    await expect(listReassignments(async () => [{ partition: 0, replicas: null }], "https://gateway.example", "orders")).rejects.toThrow("invalid reassignment");
  });

  it("sends one set/reset with a matching accepted response", async () => {
    const write = vi.fn(async () => ({ name: "retention.ms", status: "accepted" }));
    await alterConfiguration(write, "https://gateway.example/", { kind: "broker", id: 2 }, { name: "retention.ms", operation: "set", value: "60000" });
    expect(write).toHaveBeenCalledWith("https://gateway.example/api/v1/brokers/2/config", {
      method: "POST", body: JSON.stringify({ name: "retention.ms", operation: "set", value: "60000" }),
    });
    await alterConfiguration(write, "https://gateway.example", { kind: "topic", name: "orders" }, { name: "retention.ms", operation: "reset", value: null });
    expect(write).toHaveBeenLastCalledWith("https://gateway.example/api/v1/topics/orders/config", {
      method: "POST", body: JSON.stringify({ name: "retention.ms", operation: "reset", value: null }),
    });
    expect(write).toHaveBeenCalledTimes(2);
    await expect(alterConfiguration(async () => ({ name: "other", status: "accepted" }), "https://gateway.example", { kind: "broker", id: 2 }, {
      name: "retention.ms", operation: "set", value: "1",
    })).rejects.toThrow("did not confirm");
  });

  it("uses an absolute partition count and ordered replica IDs", async () => {
    const write = vi.fn(async () => ({ topic: "orders & audit", status: "accepted" }));
    await increasePartitions(write, "https://gateway.example/", "orders & audit", 4);
    await reassignPartition(write, "https://gateway.example", "orders & audit", 1, [3, 2]);
    expect(write.mock.calls).toEqual([
      ["https://gateway.example/api/v1/topics/orders%20%26%20audit/partitions", { method: "POST", body: JSON.stringify({ count: 4 }) }],
      ["https://gateway.example/api/v1/topics/orders%20%26%20audit/partitions/1/replicas", { method: "POST", body: JSON.stringify({ replicas: [3, 2] }) }],
    ]);
    const read = vi.fn(async () => [{ partition: 1, replicas: [2, 3], addingReplicas: [3], removingReplicas: [1] }]);
    expect(await listReassignments(read, "https://gateway.example", "orders & audit")).toHaveLength(1);
    expect(read).toHaveBeenCalledWith("https://gateway.example/api/v1/topics/orders%20%26%20audit/reassignments");
  });

  it("distinguishes known rejection from an uncertain write outcome", () => {
    expect(describeAdministrationError(new HttpError(422, "rejected", { code: "configuration_rejected" })).uncertain).toBe(false);
    expect(describeAdministrationError(new HttpError(503, "failed", { code: "cluster_unreachable" })).uncertain).toBe(false);
    expect(describeAdministrationError(new HttpError(503, "unknown", { code: "partition_write_unknown" })).uncertain).toBe(true);
    expect(describeAdministrationError(new TypeError("network failed")).uncertain).toBe(true);
    expect(describeAdministrationError(new Error("invalid acknowledgement")).uncertain).toBe(true);
  });
});
