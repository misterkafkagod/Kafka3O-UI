import { useState } from "react";
import { describeBackupError } from "../gateway/describeBackupError";
import type { TopicBackup } from "../gateway/listBackups";
import type { BackupActions } from "../gateway/startBackup";
import styles from "./BackupList.module.css";

type TopicRestoreProps = {
  backup: TopicBackup;
  gatewayUrl: string;
  actions: BackupActions;
  // onStarted reloads the backup so the restore's progress is followed.
  onStarted: () => void;
};

export function TopicRestore({ backup, gatewayUrl, actions, onStarted }: TopicRestoreProps) {
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const [failure, setFailure] = useState("");
  const restore = actions.restore;
  if (!restore) return null;
  const running = Boolean(backup.restore && !backup.restore.finished);

  async function start() {
    if (!restore || pending || running) return;
    if (!actions.confirm(`Restore the backup of "${backup.topic}" into "${backup.topic}"? The saved messages are appended to the topic, so messages still in it may be duplicated. The topic's backup pauses until the restore finishes.`)) {
      return;
    }
    setPending(true);
    setNotice("");
    setFailure("");
    try {
      const started = await restore(gatewayUrl, backup.topic);
      const skipped = started.skipped ?? 0;
      setNotice(`Restore started for ${started.topic} from ${started.objects} stored object${started.objects === 1 ? "" : "s"}.` +
        (skipped > 0 ? ` ${skipped} older object${skipped === 1 ? " was" : "s were"} written with another compression and ${skipped === 1 ? "is" : "are"} not restored.` : ""));
      onStarted();
    } catch (problem) {
      setFailure(describeBackupError(problem));
    } finally {
      setPending(false);
    }
  }

  return (
    <section aria-labelledby="topic-restore-heading">
      <h4 id="topic-restore-heading">Restore</h4>
      <p>A restore appends the backed-up messages to this topic, with their keys, values, headers and timestamps.</p>
      <div className={styles.actions}>
        <button type="button" disabled={pending || running} onClick={() => void start()}>{running ? "Restore running…" : "Restore"}</button>
      </div>
      {notice ? <p role="status">{notice}</p> : null}
      {failure ? <p role="alert">{failure}</p> : null}
    </section>
  );
}
