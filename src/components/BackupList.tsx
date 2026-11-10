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
            {run ? <th scope="col">Actions</th> : null}
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
                {run ? (
                  <td>
                    <div className={styles.actions}>
                      {backup.state === "PAUSED" ? (
                        <button type="button" disabled={pending} aria-label={`Resume the backup of ${backup.topic}`} onClick={() => void act(backup.topic, "resume")}>Resume</button>
                      ) : (
                        <button type="button" disabled={pending} aria-label={`Pause the backup of ${backup.topic}`} onClick={() => void act(backup.topic, "pause")}>Pause</button>
                      )}
                      <button type="button" disabled={pending} aria-label={`Delete the backup job for ${backup.topic}`} onClick={() => void act(backup.topic, "delete")}>Delete</button>
                    </div>
                  </td>
                ) : null}
              </tr>
              {backup.error ? (
                <tr className={styles.errorRow}>
                  <td colSpan={run ? 6 : 5} aria-label={`Error for ${backup.topic}`}>{backup.error}</td>
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
