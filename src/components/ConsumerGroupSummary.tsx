import type { ConsumerGroup } from "../gateway/types";
import { consumerGroupAnchor } from "../groups/consumerGroupAnchor";
import styles from "./ConsumerGroupSummary.module.css";

type ConsumerGroupSummaryProps = {
  groups: ConsumerGroup[];
};

export function ConsumerGroupSummary({ groups }: ConsumerGroupSummaryProps) {
  return (
    <nav aria-label="Consumer group summary" className={styles.summary}>
      <div className={styles.heading}>
        <h3>Groups</h3>
        <p>{groups.length} {groups.length === 1 ? "reported group" : "reported groups"}</p>
      </div>
      <ul className={styles.list}>
        {groups.map((group) => (
          <li key={group.id}>
            <a href={`#${encodeURIComponent(consumerGroupAnchor(group.id))}`}>{group.id}</a>
            <span>State: {group.state || "Unknown"}</span>
            {group.error ? <span>Group data incomplete</span> : null}
          </li>
        ))}
      </ul>
    </nav>
  );
}
