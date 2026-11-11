import { useEffect, useRef, useState } from "react";
import { describeBackupError } from "../gateway/describeBackupError";
import type { TopicBackup } from "../gateway/listBackups";
import type { BackupActionKind } from "../gateway/runBackupAction";
import type { BackupActions } from "../gateway/startBackup";
import styles from "./BackupList.module.css";

type TopicBackupActionsProps = {
  backup: TopicBackup;
  gatewayUrl: string;
  actions: BackupActions;
  // onChanged reloads the backup after an action; Connect applies actions asynchronously.
  onChanged: () => void;
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

export function TopicBackupActions({ backup, gatewayUrl, actions, onChanged }: TopicBackupActionsProps) {
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const [failure, setFailure] = useState("");
  const timers = useRef<number[]>([]);
  const run = actions.run;

  useEffect(() => () => { for (const timer of timers.current) window.clearTimeout(timer); }, []);

  async function act(kind: BackupActionKind) {
    if (!run || pending || !actions.confirm(confirmations[kind](backup.topic))) return;
    setPending(true);
    setNotice("");
    setFailure("");
    try {
      await run(gatewayUrl, backup.topic, kind);
      setNotice(requested[kind](backup.topic));
      onChanged();
      timers.current.push(window.setTimeout(onChanged, 3000));
    } catch (problem) {
      setFailure(describeBackupError(problem));
    } finally {
      setPending(false);
    }
  }

  if (!run || backup.state === "NO JOB") return null;
  return (
    <>
      <div className={styles.actions}>
        {backup.state === "PAUSED" ? (
          <button type="button" disabled={pending} onClick={() => void act("resume")}>Resume</button>
        ) : (
          <button type="button" disabled={pending} onClick={() => void act("pause")}>Pause</button>
        )}
        <button type="button" disabled={pending} onClick={() => void act("delete")}>Delete backup job</button>
      </div>
      {notice ? <p role="status">{notice}</p> : null}
      {failure ? <p role="alert">{failure}</p> : null}
    </>
  );
}
