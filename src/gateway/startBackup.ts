import type { FetchGatewayWrite } from "./GatewayWriteRequest";

export type StartedBackup = { topic: string; connector: string; location: string };

export type StartBackup = (gatewayUrl: string, topic: string) => Promise<StartedBackup>;

export type BackupActions = {
  start: StartBackup;
  confirm: (message: string) => boolean;
};

export async function startBackup(fetchWrite: FetchGatewayWrite, gatewayUrl: string, topic: string): Promise<StartedBackup> {
  const result = await fetchWrite(`${gatewayUrl.replace(/\/+$/, "")}/api/v1/backups`, { method: "POST", body: JSON.stringify({ topic }) });
  if (typeof result !== "object" || result === null || !("topic" in result) || result.topic !== topic ||
      !("location" in result) || typeof result.location !== "string") {
    throw new Error("The gateway returned an invalid backup response.");
  }
  return result as StartedBackup;
}
