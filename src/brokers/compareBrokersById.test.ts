import { describe, expect, it } from "vitest";
import { compareBrokersById } from "./compareBrokersById";

const broker = (id: number) => ({ id, host: `kafka-${id}`, port: 9092 });

describe("compareBrokersById", () => {
  it("orders by ascending ID", () => {
    expect(compareBrokersById(broker(1), broker(2))).toBeLessThan(0);
    expect(compareBrokersById(broker(2), broker(2))).toBe(0);
    expect(compareBrokersById(broker(3), broker(2))).toBeGreaterThan(0);
  });
});
