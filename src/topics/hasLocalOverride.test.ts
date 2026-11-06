import { describe, expect, it } from "vitest";
import type { KafkaConfiguration } from "../gateway/administration";
import { hasLocalOverride } from "./hasLocalOverride";

describe("hasLocalOverride", () => {
  const entry: KafkaConfiguration = { name: "x", value: "1", sensitive: false, readOnly: false, source: "DYNAMIC_DEFAULT_BROKER_CONFIG", type: "LONG" };
  it("only identifies an override for the selected resource", () => {
    expect(hasLocalOverride(entry, { kind: "broker", id: 1 })).toBe(false);
    expect(hasLocalOverride({ ...entry, source: "DYNAMIC_BROKER_CONFIG" }, { kind: "broker", id: 1 })).toBe(true);
    expect(hasLocalOverride({ ...entry, source: "DYNAMIC_BROKER_CONFIG" }, { kind: "topic", name: "orders" })).toBe(false);
    expect(hasLocalOverride({ ...entry, source: "DYNAMIC_TOPIC_CONFIG" }, { kind: "topic", name: "orders" })).toBe(true);
  });
});
