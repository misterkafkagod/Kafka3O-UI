import type { BackupSettings } from "../gateway/listBackups";

export type BackupSettingsText = { startFrom: string; compression: string; recordsPerFile: string };

const compressions: Record<string, string> = { gzip: "gzip", zstd: "zstd", snappy: "snappy", none: "None" };

export function describeBackupSettings(settings: BackupSettings | undefined): BackupSettingsText {
  if (settings === undefined) {
    return { startFrom: "Unknown", compression: "Unknown", recordsPerFile: "Unknown" };
  }
  return {
    startFrom: settings.startFrom === "latest" ? "Messages from when the backup started" : settings.startFrom === "earliest" ? "From the oldest message" : settings.startFrom,
    compression: compressions[settings.compression] ?? settings.compression,
    recordsPerFile: settings.recordsPerFile > 0
      ? `Up to ${settings.recordsPerFile.toLocaleString("en-US")} per file, written as messages arrive`
      : "No limit, written every 60 seconds",
  };
}
