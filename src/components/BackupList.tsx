import { Fragment, useEffect, useRef, useState } from "react";
import { describeBackupError } from "../gateway/describeBackupError";
import type { BackupActionKind } from "../gateway/runBackupAction";
import type { BackupActions } from "../gateway/startBackup";
import type { TopicBackup } from "../gateway/listBackups";
import { formatBytes } from "../groups/formatBytes";
import styles from "./BackupList.module.css";
import { ScrollableTableRegion } from "./ScrollableTableRegion";

type BackupListProps = {
  backups: TopicBackup[];
  gatewayUrl?: string;
  actions?: BackupActions;
  // onChanged reloads the list after an action; Connect applies actions asynchronously.
  onChanged?: () => void;
};

const confirmations: Record<BackupActionKind, (topic: string) => string> = {
  pause: (topic) => `Pause the backup of "${topic}"? New messages are not stored until it resumes.`,
  resume: (topic) => `Resume the backup of "${topic}"?`,
  delete: (topic) => `Delete the backup job for "${topic}"? The stored objects are kept; only the job stops.`,
};

const requested: Record<BackupActionKind, (topic: string) => string> = {
  pause: (topic) => `Pause requested for the backup of ${topic}.`,
  resume: (topic) => `Resume requested for the backup of ${topic}.`,
  delete: (topic) => `The backup job for ${topic} was deleted. Its stored objects are kept.`,
};

export function BackupList({ backups, gatewayUrl, actions, onChanged }: BackupListProps) {
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const [failure, setFailure] = useState("");
  const timers = useRef<number[]>([]);
  const run = actions?.run;
  const restore = actions?.restore;

  useEffect(() => () => { for (const timer of timers.current) window.clearTimeout(timer); }, []);

  async function act(topic: string, kind: BackupActionKind) {
    if (!run || !actions || !gatewayUrl || pending || !actions.confirm(confirmations[kind](topic))) return;
    setPending(true);
    setNotice("");
    setFailure("");
    try {
      await run(gatewayUrl, topic, kind);
      setNotice(requested[kind](topic));
      onChanged?.();
      timers.current.push(window.setTimeout(() => onChanged?.(), 3000));
    } catch (problem) {
      setFailure(describeBackupError(problem));
    } finally {
      setPending(false);
    }
  }

  async function restoreTopic(topic: string) {
    if (!restore || !actions || !gatewayUrl || pending) return;
    if (!actions.confirm(`Restore the backup of "${topic}" into "${topic}"? The saved messages are appended to the topic, so messages still in it may be duplicated. The topic's backup pauses until the restore finishes.`)) {
      return;
    }
    setPending(true);
    setNotice("");
    setFailure("");
    try {
      const started = await restore(gatewayUrl, topic);
      setNotice(`Restore started for ${started.topic} from ${started.objects} stored object${started.objects === 1 ? "" : "s"}.`);
      onChanged?.();
    } catch (problem) {
      setFailure(describeBackupError(problem));
    } finally {
      setPending(false);
    }
  }

  const hasActions = Boolean(run || restore);
  if (backups.length === 0) return <p>No backups yet.</p>;
  return (
    <>
    {notice ? <p role="status">{notice}</p> : null}
    {failure ? <p role="alert">{failure}</p> : null}
    <ScrollableTableRegion label="Topic backups table scroll area">
      <table aria-label="Topic backups">
        <thead>
          <tr>
            <th scope="col">Topic</th>
            <th scope="col">State</th>
            <th scope="col">Location</th>
            <th scope="col">Last write</th>
            <th scope="col">Stored</th>
            {hasActions ? <th scope="col">Actions</th> : null}
          </tr>
        </thead>
        <tbody>
          {backups.map((backup) => (
            <Fragment key={backup.connector}>
              <tr>
                <th scope="row">{backup.topic}</th>
                <td>{backup.state ?? "Unknown"}</td>
                <td><code className={styles.location}>{backup.location}</code></td>
                <td>{backup.storage === undefined ? "Unknown" : backup.storage.lastWrite === null ? "Nothing written yet"
                  : new Date(backup.storage.lastWrite).toLocaleString()}</td>
                <td>{backup.storage === undefined ? "Unknown"
                  : `${formatBytes(backup.storage.storedBytes)} in ${backup.storage.objects} object${backup.storage.objects === 1 ? "" : "s"}`}</td>
                {hasActions ? (
                  <td>
                    <div className={styles.actions}>
                      {restore ? (
                        <button type="button" disabled={pending || Boolean(backup.restore && !backup.restore.finished)}
                          aria-label={`Restore the backup of ${backup.topic}`} onClick={() => void restoreTopic(backup.topic)}>Restore</button>
                      ) : null}
                      {!run ? null : backup.state === "PAUSED" ? (
                        <button type="button" disabled={pending} aria-label={`Resume the backup of ${backup.topic}`} onClick={() => void act(backup.topic, "resume")}>Resume</button>
                      ) : (
                        <button type="button" disabled={pending} aria-label={`Pause the backup of ${backup.topic}`} onClick={() => void act(backup.topic, "pause")}>Pause</button>
                      )}
                      {run ? (
                        <button type="button" disabled={pending} aria-label={`Delete the backup job for ${backup.topic}`} onClick={() => void act(backup.topic, "delete")}>Delete</button>
                      ) : null}
                    </div>
                  </td>
                ) : null}
              </tr>
              {backup.restore ? (
                <tr className={backup.restore.error ? styles.errorRow : styles.restoreRow}>
                  <td colSpan={hasActions ? 6 : 5} aria-label={`Restore of ${backup.topic}`}>
                    {backup.restore.finished ? `Last restore finished: ${backup.restore.total} records restored.`
                      : backup.restore.error ? `Restore ${backup.restore.state === "FAILED" ? "failed" : "needs attention"}: ${backup.restore.error}`
                        : `Restoring ${backup.restore.restored} of ${backup.restore.total} records.`}
                  </td>
                </tr>
              ) : null}
              {backup.error ? (
                <tr className={styles.errorRow}>
                  <td colSpan={hasActions ? 6 : 5} aria-label={`Error for ${backup.topic}`}>{backup.error}</td>
                </tr>
              ) : null}
            </Fragment>
          ))}
        </tbody>
      </table>
    </ScrollableTableRegion>
    </>
  );
}
