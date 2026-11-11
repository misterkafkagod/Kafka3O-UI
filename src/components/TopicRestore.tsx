import { useId, useState } from "react";
import { describeBackupError } from "../gateway/describeBackupError";
import type { TopicBackup } from "../gateway/listBackups";
import type { BackupActions } from "../gateway/startBackup";
import type { RestoreSelection } from "../gateway/startRestore";
import styles from "./BackupList.module.css";
import { readRestoreFilter } from "./readRestoreFilter";
import startStyles from "./StartBackup.module.css";

type TopicRestoreProps = {
  backup: TopicBackup;
  gatewayUrl: string;
  actions: BackupActions;
  // onStarted reloads the backup so the restore's progress is followed.
  onStarted: () => void;
};

export function TopicRestore({ backup, gatewayUrl, actions, onStarted }: TopicRestoreProps) {
  const id = useId();
  const [mode, setMode] = useState<"everything" | "some">("everything");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [partitions, setPartitions] = useState("");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const [failure, setFailure] = useState("");
  const restore = actions.restore;
  if (!restore) return null;
  const running = Boolean(backup.restore && !backup.restore.finished);

  async function start() {
    if (!restore || pending || running) return;
    let selection: RestoreSelection | undefined;
    if (mode === "some") {
      const read = readRestoreFilter({ from, to, partitions });
      if (read.error !== undefined) {
        setNotice("");
        setFailure(read.error);
        return;
      }
      selection = read.selection;
    }
    const scope = selection === undefined ? `the backup of "${backup.topic}"` : [
      `the backed-up messages of "${backup.topic}"`,
      selection.partitions ? `in partition${selection.partitions.length === 1 ? "" : "s"} ${selection.partitions.join(", ")}` : "",
      selection.from ? `from ${new Date(selection.from).toLocaleString()}` : "",
      selection.to ? `before ${new Date(selection.to).toLocaleString()}` : "",
    ].filter(Boolean).join(" ");
    if (!actions.confirm(`Restore ${scope} into "${backup.topic}"? The saved messages are appended to the topic, so messages still in it may be duplicated. The topic's backup pauses until the restore finishes.`)) {
      return;
    }
    setPending(true);
    setNotice("");
    setFailure("");
    try {
      const started = await restore(gatewayUrl, backup.topic, selection);
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
      <fieldset>
        <legend>Messages to restore</legend>
        <label><input type="radio" name={`${id}-mode`} checked={mode === "everything"} onChange={() => setMode("everything")} /> Everything</label>
        <label><input type="radio" name={`${id}-mode`} checked={mode === "some"} onChange={() => setMode("some")} /> Only some messages</label>
      </fieldset>
      {mode === "some" ? (
        <div className={startStyles.form}>
          <label htmlFor={`${id}-from`}>From (local time)</label>
          <input id={`${id}-from`} type="datetime-local" step="1" value={from} onChange={(event) => setFrom(event.target.value)} />
          <label htmlFor={`${id}-to`}>Before (local time)</label>
          <input id={`${id}-to`} type="datetime-local" step="1" value={to} onChange={(event) => setTo(event.target.value)} />
          <label htmlFor={`${id}-partitions`}>Partitions</label>
          <input id={`${id}-partitions`} value={partitions} placeholder="All" aria-describedby={`${id}-partitions-hint`} onChange={(event) => setPartitions(event.target.value)} />
          <p id={`${id}-partitions-hint`}>Leave a field empty for no limit. Partitions are separated by commas, for example 0, 2.</p>
        </div>
      ) : null}
      <div className={styles.actions}>
        <button type="button" disabled={pending || running} onClick={() => void start()}>{running ? "Restore running…" : "Restore"}</button>
      </div>
      {notice ? <p role="status">{notice}</p> : null}
      {failure ? <p role="alert">{failure}</p> : null}
    </section>
  );
}
