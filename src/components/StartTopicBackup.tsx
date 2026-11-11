import { type FormEvent, useId, useState } from "react";
import { describeBackupError } from "../gateway/describeBackupError";
import type { BackupActions } from "../gateway/startBackup";
import type { GatewayEntry } from "../gateway/types";
import styles from "./StartBackup.module.css";

type StartTopicBackupProps = {
  gateway: GatewayEntry;
  topicName: string;
  actions: BackupActions;
  onStarted?: () => void;
};

const maxRecordsPerFile = 1_000_000;

export function StartTopicBackup({ gateway, topicName, actions, onStarted }: StartTopicBackupProps) {
  const id = useId();
  const [startFrom, setStartFrom] = useState("earliest");
  const [compression, setCompression] = useState("gzip");
  const [records, setRecords] = useState("0");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const recordsPerFile = /^\d+$/.test(records.trim()) ? Number(records.trim()) : NaN;
  const recordsInvalid = !Number.isSafeInteger(recordsPerFile) || recordsPerFile > maxRecordsPerFile;

  async function start(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    if (recordsInvalid) {
      setError(`Records per file must be a whole number from 0 to ${maxRecordsPerFile.toLocaleString("en-US")}.`);
      return;
    }
    if (!actions.confirm(`Start a continuous backup of "${topicName}" on ${gateway.name}? Its messages are copied to the cluster's backup storage until the backup is deleted.`)) {
      return;
    }
    setPending(true);
    setNotice("");
    setError("");
    try {
      const started = await actions.start(gateway.url, topicName, { startFrom, compression, recordsPerFile });
      setNotice(`Backup started for ${started.topic}. Messages are stored in ${started.location}.`);
      onStarted?.();
    } catch (failure) {
      setError(describeBackupError(failure));
    } finally {
      setPending(false);
    }
  }

  return (
    <section aria-labelledby={`${id}-title`} className={styles.start}>
      <h4 id={`${id}-title`}>Start backup</h4>
      <form onSubmit={start} className={styles.form} aria-label="Start backup">
        <label htmlFor={`${id}-start`}>Back up</label>
        <select id={`${id}-start`} value={startFrom} onChange={(event) => setStartFrom(event.target.value)}>
          <option value="earliest">From the oldest message</option>
          <option value="latest">Messages from now on</option>
        </select>
        <label htmlFor={`${id}-compression`}>Compression</label>
        <select id={`${id}-compression`} value={compression} onChange={(event) => setCompression(event.target.value)}>
          <option value="gzip">gzip</option>
          <option value="zstd">zstd</option>
          <option value="snappy">snappy</option>
          <option value="none">None</option>
        </select>
        <label htmlFor={`${id}-records`}>Records per file</label>
        <input id={`${id}-records`} inputMode="numeric" value={records} aria-describedby={`${id}-records-hint`}
          aria-invalid={recordsInvalid} onChange={(event) => setRecords(event.target.value)} />
        <button type="submit" disabled={pending}>{pending ? "Starting…" : "Start backup"}</button>
      </form>
      <p id={`${id}-records-hint`}>Files are written to the storage every 60 seconds; a limit splits them into smaller files (0 means no limit).
        If this topic was backed up before, the new backup continues where the previous one stopped.</p>
      {notice ? <p role="status">{notice}</p> : null}
      {error ? <p role="alert">{error}</p> : null}
    </section>
  );
}
