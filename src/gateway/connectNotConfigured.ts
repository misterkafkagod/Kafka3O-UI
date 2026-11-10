import { HttpError } from "./HttpError";
import type { ConnectConnector } from "./listConnectors";

// connectNotConfigured stands in for builds without a Connect client, so the tab says "not configured".
export async function connectNotConfigured(): Promise<ConnectConnector[]> {
  throw new HttpError(404, "Kafka Connect is not configured", { code: "connect_not_configured" });
}
