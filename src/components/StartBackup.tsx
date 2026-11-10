import { type FormEvent, useId, useState } from "react";
import { describeBackupError } from "../gateway/describeBackupError";
import type { ListTopics } from "../gateway/listTopics";
import type { BackupActions } from "../gateway/startBackup";
import type { GatewayEntry } from "../gateway/types";
import { useTopics } from "../hooks/useTopics";
import { isConnectStorageTopic } from "../groups/isConnectStorageTopic";
import styles from "./StartBackup.module.css";

type StartBackupProps = {
  gateway: GatewayEntry;
  listTopics: ListTopics;
  actions: BackupActions;
  onStarted?: () => void;
  // backedUp lists topics that already have a backup; they are not offered again.
  backedUp?: string[];
};

export function StartBackup({ gateway, listTopics, actions, onStarted, backedUp = [] }: StartBackupProps) {
  const id = useId();
  const { data: topics } = useTopics(gateway, listTopics);
  const names = (topics ?? [])
    .filter((topic) => !topic.internal && !isConnectStorageTopic(topic.name) && !backedUp.includes(topic.name))
    .map((topic) => topic.name);
  const [topic, setTopic] = useState("");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const selected = names.includes(topic) ? topic : names[0] ?? "";

  async function start(event: FormEvent) {
    event.preventDefault();
    if (!selected || pending) return;
    if (!actions.confirm(`Start a continuous backup of "${selected}" on ${gateway.name}? Its messages are copied to the cluster's backup storage until the backup is deleted.`)) {
      return;
    }
    setPending(true);
    setNotice("");
    setError("");
    try {
      const started = await actions.start(gateway.url, selected);
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
      <h3 id={`${id}-title`}>Start backup</h3>
      {topics === undefined ? <p role="status">Loading topics…</p> : names.length === 0 ? <p>No topics to back up.</p> : (
        <form onSubmit={start} className={styles.form} aria-label="Start backup">
          <label htmlFor={`${id}-topic`}>Topic</label>
          <select id={`${id}-topic`} value={selected} onChange={(event) => setTopic(event.target.value)}>
            {names.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
          <button type="submit" disabled={pending}>{pending ? "Starting…" : "Start backup"}</button>
        </form>
      )}
      {notice ? <p role="status">{notice}</p> : null}
      {error ? <p role="alert">{error}</p> : null}
    </section>
  );
}
