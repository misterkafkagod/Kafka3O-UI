import type { Broker } from "../gateway/types";

export function compareBrokersById(a: Broker, b: Broker): number {
  return a.id - b.id;
}
