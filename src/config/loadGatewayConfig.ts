import type { FetchJson } from "../gateway/fetchJson";
import type { GatewayEntry } from "../gateway/types";
import { parseGatewayConfig } from "./parseGatewayConfig";

export type LoadGatewayConfig = () => Promise<GatewayEntry[]>;

export async function loadGatewayConfig(fetchJson: FetchJson): Promise<GatewayEntry[]> {
  try {
    return parseGatewayConfig(await fetchJson("/config.json"));
  } catch {
    return [];
  }
}
