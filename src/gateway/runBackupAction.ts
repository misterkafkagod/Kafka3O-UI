import type { FetchGatewayWrite } from "./GatewayWriteRequest";

export type BackupActionKind = "pause" | "resume" | "delete";

export type RunBackupAction = (gatewayUrl: string, topic: string, kind: BackupActionKind) => Promise<void>;

// runBackupAction asks the Gateway to pause, resume or delete a topic's backup job; stored objects are kept.
export async function runBackupAction(fetchWrite: FetchGatewayWrite, gatewayUrl: string, topic: string, kind: BackupActionKind): Promise<void> {
  const base = `${gatewayUrl.replace(/\/+$/, "")}/api/v1/backups/${encodeURIComponent(topic)}`;
  await fetchWrite(kind === "delete" ? base : `${base}/${kind}`, { method: kind === "delete" ? "DELETE" : "POST" });
}
