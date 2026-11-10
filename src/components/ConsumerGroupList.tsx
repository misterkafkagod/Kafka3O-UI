import type { ConsumerGroup } from "../gateway/types";
import { consumerGroupAnchor } from "../groups/consumerGroupAnchor";
import { consumerGroupTotalLag } from "../groups/consumerGroupTotalLag";
import { ScrollableTableRegion } from "./ScrollableTableRegion";
import styles from "./ConsumerGroupList.module.css";

type ConsumerGroupListProps = {
  groups: ConsumerGroup[];
};

export function ConsumerGroupList({ groups }: ConsumerGroupListProps) {
  const sorted = [...groups].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return (
    <ScrollableTableRegion label="Consumer groups table scroll area">
      <table aria-label="Consumer groups" className={styles.list}>
        <thead>
          <tr>
            <th scope="col">Group</th>
            <th scope="col">State</th>
            <th scope="col">Members</th>
            <th scope="col">Topics</th>
            <th scope="col">Total lag</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((group) => {
            const total = consumerGroupTotalLag(group);
            return (
              <tr key={group.id}>
                <th scope="row" className={styles.name}>
                  <a href={`#${encodeURIComponent(consumerGroupAnchor(group.id))}`}>{group.id}</a>
                  {group.error ? <span className={styles.incomplete}>Group data incomplete</span> : null}
                </th>
                <td>{group.state || "Unknown"}</td>
                <td>{group.members.length}</td>
                <td>{group.topics.length}</td>
                <td>
                  {total.kind === "known" ? total.lag : total.kind === "unknown" ? `Unknown (${total.partitions} ${total.partitions === 1 ? "partition" : "partitions"})` : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </ScrollableTableRegion>
  );
}
