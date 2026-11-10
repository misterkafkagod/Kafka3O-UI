import { type FormEvent, useId, useState } from "react";
import { describeOffsetResetError } from "../gateway/describeOffsetResetError";
import type { OffsetResetPreview as Preview, OffsetResetTarget, PreviewOffsetReset } from "../gateway/previewOffsetReset";
import type { ConsumerGroup } from "../gateway/types";
import styles from "./OffsetResetPreview.module.css";
import { ScrollableTableRegion } from "./ScrollableTableRegion";

type OffsetResetPreviewProps = {
  gatewayUrl: string;
  group: ConsumerGroup;
  previewOffsetReset: PreviewOffsetReset;
};

const targetLabels = { earliest: "Earliest", latest: "Latest", timestamp: "Date and time" } as const;

export function OffsetResetPreview({ gatewayUrl, group, previewOffsetReset }: OffsetResetPreviewProps) {
  const id = useId();
  const [topic, setTopic] = useState(group.topics[0] ?? "");
  const [kind, setKind] = useState<OffsetResetTarget["kind"]>("earliest");
  const [moment, setMoment] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);

  async function requestPreview(event: FormEvent) {
    event.preventDefault();
    const timestamp = kind === "timestamp" ? new Date(moment).getTime() : 0;
    if (!topic || (kind === "timestamp" && !Number.isFinite(timestamp))) {
      setError("Choose a topic and a valid target.");
      return;
    }
    setPending(true);
    setError("");
    setPreview(null);
    try {
      const target: OffsetResetTarget = kind === "timestamp" ? { kind, timestamp } : { kind };
      setPreview(await previewOffsetReset(gatewayUrl, group.id, topic, target));
    } catch (failure) {
      setError(describeOffsetResetError(failure));
    } finally {
      setPending(false);
    }
  }

  if (group.topics.length === 0) {
    return <p className={styles.note}>This group has no committed topics to reset.</p>;
  }
  return (
    <details className={styles.reset}>
      <summary>Reset offsets</summary>
      <form aria-label={`Reset offsets for ${group.id}`} onSubmit={requestPreview} className={styles.form}>
        <label htmlFor={`${id}-topic`}>Topic</label>
        <select id={`${id}-topic`} value={topic} onChange={(event) => { setTopic(event.target.value); setPreview(null); }}>
          {group.topics.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
        <fieldset>
          <legend>Reset to</legend>
          {(Object.keys(targetLabels) as OffsetResetTarget["kind"][]).map((option) => (
            <label key={option}>
              <input type="radio" name={`${id}-target`} value={option} checked={kind === option}
                onChange={() => { setKind(option); setPreview(null); }} />
              {targetLabels[option]}
            </label>
          ))}
        </fieldset>
        {kind === "timestamp" ? (
          <label>
            Date and time (your local time)
            <input type="datetime-local" step="1" required value={moment} onChange={(event) => { setMoment(event.target.value); setPreview(null); }} />
          </label>
        ) : null}
        <button type="submit" disabled={pending}>{pending ? "Previewing..." : "Preview"}</button>
      </form>
      {error ? <p role="alert">{error}</p> : null}
      {preview ? (
        <>
          <p role="status">Preview only. Nothing has been changed.</p>
          <ScrollableTableRegion label={`Offset reset preview for ${preview.group} table scroll area`}>
            <table aria-label={`Offset reset preview for ${preview.group} on ${preview.topic}`}>
              <thead>
                <tr>
                  <th scope="col">Partition</th>
                  <th scope="col">Current offset</th>
                  <th scope="col">New offset</th>
                </tr>
              </thead>
              <tbody>
                {preview.partitions.map((partition) => (
                  <tr key={partition.partition}>
                    <td>{partition.partition}</td>
                    <td>{partition.currentOffset ?? "No commit"}</td>
                    <td>{partition.targetOffset}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollableTableRegion>
        </>
      ) : null}
    </details>
  );
}
