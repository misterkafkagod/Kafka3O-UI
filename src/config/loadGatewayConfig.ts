import type { FetchJson } from "../gateway/fetchJson";
import { HttpError } from "../gateway/HttpError";
import type { GatewayEntry } from "../gateway/types";
import { parseGatewayConfig } from "./parseGatewayConfig";

export type LoadGatewayConfig = () => Promise<GatewayEntry[]>;

export async function loadGatewayConfig(fetchJson: FetchJson): Promise<GatewayEntry[]> {
  try {
    return parseGatewayConfig(await fetchJson("/config.json"));
  } catch (error) {
    if (error instanceof SyntaxError || (error instanceof HttpError && error.status === 404)) {
      return [];
    }
    throw error;
  }
}
