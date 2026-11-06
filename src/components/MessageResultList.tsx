import type { TopicMessage } from "../gateway/types";
import { exactMessageOffset } from "../messages/exactMessageOffset";
import styles from "./MessageWorkspace.module.css";

type MessageResultListProps = {
  messages: TopicMessage[];
  selectedIndex: number;
  inspectorId: string;
  onSelect: (message: TopicMessage) => void;
};

export function MessageResultList({ messages, selectedIndex, inspectorId, onSelect }: MessageResultListProps) {
  return (
    <section aria-label="Message results" className={styles.results}>
      <div className={styles.resultHeading}>
        <h4>Results</h4>
        <p>{messages.length} {messages.length === 1 ? "record" : "records"}</p>
      </div>
      <ol className={styles.resultList}>
        {messages.map((message, index) => {
          const offset = exactMessageOffset(message);
          return (
            <li key={offset === undefined ? `${message.partition}-unavailable-${index}` : `${message.partition}-${offset}`}>
              <button
                type="button"
                className={styles.resultButton}
                aria-label={`Inspect record ${index + 1}, partition ${message.partition}, offset ${offset ?? "unavailable"}`}
                aria-controls={inspectorId}
                aria-pressed={selectedIndex === index}
                onClick={() => onSelect(message)}
              >
                <span>Partition {message.partition}</span>
                <strong>Offset {offset ?? "unavailable"}</strong>
                <time dateTime={message.timestamp}>{new Date(message.timestamp).toLocaleString()}</time>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
