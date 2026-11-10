import type { FetchJson } from "./fetchJson";

export type ConnectTask = { id: number; state: string; workerId: string; error?: string };

// ConnectConnector is a connector's status; the Gateway never returns its configuration.
export type ConnectConnector = { name: string; type: string; state: string; workerId: string; error?: string; tasks: ConnectTask[] };

export type ListConnectors = (gatewayUrl: string) => Promise<ConnectConnector[]>;

export async function listConnectors(fetchJson: FetchJson, gatewayUrl: string): Promise<ConnectConnector[]> {
  return (await fetchJson(`${gatewayUrl.replace(/\/+$/, "")}/api/v1/connect/connectors`)) as ConnectConnector[];
}
