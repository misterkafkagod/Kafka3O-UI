import type { FetchJson } from "./fetchJson";

export type BackupStorage = { objects: number; storedBytes: number; lastWrite: string | null };

export type BackupRestore = {
  restoreId: string;
  state: string;
  restored: number;
  total: number;
  finished: boolean;
  error?: string;
};

export type TopicBackup = {
  topic: string;
  connector: string;
  location: string;
  state?: string;
  error?: string;
  // storage is absent when the Gateway could not list the backup storage.
  storage?: BackupStorage;
  // restore is present while a restore runs, and once when it has just finished.
  restore?: BackupRestore;
};

export type ListBackups = (gatewayUrl: string) => Promise<TopicBackup[]>;

export async function listBackups(fetchJson: FetchJson, gatewayUrl: string): Promise<TopicBackup[]> {
  const result = await fetchJson(`${gatewayUrl.replace(/\/+$/, "")}/api/v1/backups`);
  if (typeof result !== "object" || result === null || !("backups" in result) || !Array.isArray(result.backups)) {
    throw new Error("The gateway returned an invalid backup list.");
  }
  return result.backups as TopicBackup[];
}
