import { HttpError } from "../gateway/HttpError";
import type { ListBackups } from "../gateway/listBackups";
import type { BackupActions } from "../gateway/startBackup";
import type { GatewayEntry } from "../gateway/types";
import { formatBytes } from "../groups/formatBytes";
import { useBackups } from "../hooks/useBackups";
import styles from "./BackupList.module.css";
import { describeBackupSettings } from "./describeBackupSettings";
import { ErrorWithRetry } from "./ErrorWithRetry";
import { StartTopicBackup } from "./StartTopicBackup";

type TopicBackupProps = {
  gateway: GatewayEntry;
  topicName: string;
  listBackups: ListBackups;
  // actions are absent for read-only embeddings; without them no Start form is shown.
  actions?: BackupActions;
};

export function TopicBackup({ gateway, topicName, listBackups, actions }: TopicBackupProps) {
  const { data: backups, isError, error, refetch } = useBackups(gateway, listBackups);
  const code = error instanceof HttpError ? error.problem?.code : undefined;
  const backup = backups?.find((candidate) => candidate.topic === topicName);
  const settings = describeBackupSettings(backup?.settings);

  return (
    <section aria-labelledby="topic-backup-heading">
      <h3 id="topic-backup-heading">Backup</h3>
      <p>The backup copies this topic's messages continuously to the cluster's S3 backup storage through Kafka Connect.</p>
      {isError && code === "backups_not_configured" ? (
        <p role="status">Backups are not configured for this cluster.</p>
      ) : isError && code === "connect_unreachable" ? (
        <div role="alert">
          <p>Kafka Connect is unreachable, so the backup cannot be shown.</p>
          <button type="button" onClick={() => void refetch()}>Retry</button>
        </div>
      ) : isError ? (
        <ErrorWithRetry error={error} gateway={gateway} onRetry={() => void refetch()} />
      ) : backups === undefined ? (
        <p role="status">Loading the backup…</p>
      ) : backup === undefined ? (
        <>
          <p>No backup for this topic.</p>
          {actions ? <StartTopicBackup gateway={gateway} topicName={topicName} actions={actions} onStarted={() => void refetch()} /> : null}
        </>
      ) : (
        <>
          <dl aria-label={`Backup of ${topicName}`}>
            <dt>State</dt>
            <dd className={styles.state}>{backup.state ?? "Unknown"}</dd>
            <dt>Location</dt>
            <dd><code className={styles.location}>{backup.location}</code></dd>
            <dt>Last write</dt>
            <dd>{backup.storage === undefined ? "Unknown" : backup.storage.lastWrite === null ? "Nothing written yet"
              : new Date(backup.storage.lastWrite).toLocaleString()}</dd>
            <dt>Stored</dt>
            <dd>{backup.storage === undefined ? "Unknown"
              : `${formatBytes(backup.storage.storedBytes)} in ${backup.storage.objects} object${backup.storage.objects === 1 ? "" : "s"}`}</dd>
            <dt>Starts</dt>
            <dd>{settings.startFrom}</dd>
            <dt>Compression</dt>
            <dd>{settings.compression}</dd>
            <dt>Records per file</dt>
            <dd>{settings.recordsPerFile}</dd>
          </dl>
          {backup.error ? <p role="alert">{backup.error}</p> : null}
          {backup.restore ? (
            <p role="status">
              {backup.restore.finished ? `Last restore finished: ${backup.restore.total} records restored.`
                : backup.restore.error ? `Restore ${backup.restore.state === "FAILED" ? "failed" : "needs attention"}: ${backup.restore.error}`
                  : `Restoring ${backup.restore.restored} of ${backup.restore.total} records.`}
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
