import { useState } from "react";
import type { FormEvent } from "react";
import type { TopicMessagePosition } from "../gateway/types";

type ReadTopicMessagesFormProps = {
  onRead: (position: TopicMessagePosition) => void;
  onReadLatest: () => void;
};

export function ReadTopicMessagesForm({ onRead, onReadLatest }: ReadTopicMessagesFormProps) {
  const [partition, setPartition] = useState("0");
  const [mode, setMode] = useState<"offset" | "timestamp">("offset");
  const [offset, setOffset] = useState("0");
  const [timestamp, setTimestamp] = useState("0");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const partitionNumber = Number(partition);
    if (mode === "offset") {
      onRead({ partition: partitionNumber, offset: Number(offset) });
    } else {
      onRead({ partition: partitionNumber, timestamp: Number(timestamp) });
    }
  }

  return (
    <form onSubmit={submit}>
      <label>
        Partition
        <input
          type="number"
          step="1"
          required
          value={partition}
          onChange={(event) => setPartition(event.target.value)}
        />
      </label>
      <fieldset>
        <legend>Start from</legend>
        <label>
          <input
            type="radio"
            name="message-position-mode"
            value="offset"
            checked={mode === "offset"}
            onChange={() => setMode("offset")}
          />
          Offset
        </label>
        <label>
          <input
            type="radio"
            name="message-position-mode"
            value="timestamp"
            checked={mode === "timestamp"}
            onChange={() => setMode("timestamp")}
          />
          Timestamp
        </label>
      </fieldset>
      {mode === "offset" ? (
        <label>
          Offset
          <input type="number" step="1" required value={offset} onChange={(event) => setOffset(event.target.value)} />
        </label>
      ) : (
        <label>
          Timestamp (Unix milliseconds)
          <input
            type="number"
            step="1"
            required
            value={timestamp}
            onChange={(event) => setTimestamp(event.target.value)}
          />
        </label>
      )}
      <button type="submit">Read messages</button>
      <button type="button" onClick={onReadLatest}>
        Latest messages
      </button>
    </form>
  );
}
