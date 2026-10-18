import type { GatewayEntry } from "../gateway/types";

export function parseGatewayConfig(raw: unknown): GatewayEntry[] {
  const gateways = (raw as { gateways?: unknown } | null)?.gateways;
  if (!Array.isArray(gateways)) {
    return [];
  }
  const entries: GatewayEntry[] = [];
  const seenIds = new Set<string>();
  for (const candidate of gateways) {
    const { id, name, url } = (candidate ?? {}) as Record<string, unknown>;
    const valid =
      typeof id === "string" &&
      id !== "" &&
      typeof name === "string" &&
      name !== "" &&
      typeof url === "string" &&
      /^https?:\/\/./.test(url) &&
      !seenIds.has(id);
    if (!valid) {
      return [];
    }
    seenIds.add(id);
    entries.push({ id, name, url });
  }
  return entries;
}
