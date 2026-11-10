import { HttpError } from "./HttpError";
import type { TopicBackup } from "./listBackups";

// backupsNotConfigured stands in for builds without a backup client, so the tab says "not configured".
export async function backupsNotConfigured(): Promise<TopicBackup[]> {
  throw new HttpError(404, "Backups are not configured", { code: "backups_not_configured" });
}
