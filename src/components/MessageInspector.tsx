import { useState } from "react";
import type { TopicMessage } from "../gateway/types";
import { exactMessageOffset } from "../messages/exactMessageOffset";
import { formatMessageValue, type MessageValueFormat } from "../messages/formatMessageValue";
import type { MessageLinkContext } from "../messages/messageLink";
import { CopyMessageLink } from "./CopyMessageLink";
import styles from "./MessageWorkspace.module.css";

type MessageInspectorProps = {
  id: string;
  message: TopicMessage;
  messageLinks?: MessageLinkContext;
};

export function MessageInspector({ id, message, messageLinks }: MessageInspectorProps) {
  const [valueFormat, setValueFormat] = useState<MessageValueFormat>("text");
  const offset = exactMessageOffset(message);
  const formattedValue = message.value === null ? null : formatMessageValue(message.value, valueFormat);

  return (
    <section id={id} aria-label="Selected message" className={styles.inspector}>
      <h4>Selected message</h4>
      <dl className={styles.metadata}>
        <div><dt>Partition</dt><dd>{message.partition}</dd></div>
        <div><dt>Offset</dt><dd>{offset ?? "Exact offset unavailable"}</dd></div>
        <div><dt>Timestamp</dt><dd><time dateTime={message.timestamp}>{new Date(message.timestamp).toLocaleString()}</time></dd></div>
      </dl>
      <section className={styles.payload} aria-label="Message key">
        <h5>Key (base64)</h5>
        <pre>{message.key === null ? "(null)" : message.key || "(empty)"}</pre>
      </section>
      <section className={styles.payload} aria-label="Message value">
        <div className={styles.valueHeading}>
          <h5>Value</h5>
          <label className={styles.format}>
            Value format
            <select
              value={valueFormat}
              onChange={(event) => {
                const value = event.target.value;
                if (value === "text" || value === "json" || value === "base64") {
                  setValueFormat(value);
                }
              }}
            >
              <option value="text">Text</option>
              <option value="json">JSON</option>
              <option value="base64">Base64</option>
            </select>
          </label>
        </div>
        {formattedValue?.invalidJson ? <p role="status">Invalid JSON</p> : null}
        <pre>{formattedValue === null ? "(null)" : formattedValue.value || "(empty)"}</pre>
      </section>
      <section className={styles.payload} aria-label="Message headers">
        <h5>Headers</h5>
        {message.headers.length === 0 ? (
          <p>(none)</p>
        ) : (
          <ul>
            {message.headers.map((header, index) => (
              <li key={`${header.key}-${index}`}>
                {header.key}: {header.value === null ? "(null)" : header.value || "(empty)"}
              </li>
            ))}
          </ul>
        )}
      </section>
      {messageLinks === undefined ? null : (
        <div className={styles.link}>
          <CopyMessageLink
            key={JSON.stringify([messageLinks.origin, messageLinks.gatewayId, messageLinks.topicName, message.partition, offset])}
            context={messageLinks}
            message={message}
          />
        </div>
      )}
    </section>
  );
}
