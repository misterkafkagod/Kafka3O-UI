import type { FetchGatewayWrite } from "./GatewayWriteRequest";

export type ConnectorAction =
  | { kind: "pause" | "resume" | "restart"; connector: string }
  | { kind: "restart-task"; connector: string; task: number };

export type RunConnectorAction = (gatewayUrl: string, action: ConnectorAction) => Promise<void>;

export type ConnectorActions = {
  run: RunConnectorAction;
  confirm: (message: string) => boolean;
};

// runConnectorAction asks the Gateway to request a lifecycle action; Connect applies it asynchronously.
export async function runConnectorAction(fetchWrite: FetchGatewayWrite, gatewayUrl: string, action: ConnectorAction): Promise<void> {
  const base = `${gatewayUrl.replace(/\/+$/, "")}/api/v1/connect/connectors/${encodeURIComponent(action.connector)}`;
  const path = action.kind === "restart-task" ? `${base}/tasks/${action.task}/restart` : `${base}/${action.kind}`;
  await fetchWrite(path, { method: "POST" });
}
