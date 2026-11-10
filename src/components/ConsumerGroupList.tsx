import { Link, useNavigate } from "react-router";
import type { ConsumerGroup } from "../gateway/types";
import { consumerGroupTotalLag } from "../groups/consumerGroupTotalLag";
import { ScrollableTableRegion } from "./ScrollableTableRegion";
import styles from "./ConsumerGroupList.module.css";

type ConsumerGroupListProps = {
  gatewayId: string;
  groups: ConsumerGroup[];
};

export function ConsumerGroupList({ gatewayId, groups }: ConsumerGroupListProps) {
  const navigate = useNavigate();
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
            const groupPath = `/clusters/${encodeURIComponent(gatewayId)}/consumer-groups/${encodeURIComponent(group.id)}`;
            return (
              // The name link is the keyboard path; a click anywhere else on the row opens the same page.
              <tr key={group.id} className={styles.row} onClick={(event) => {
                if (!(event.target instanceof Element && event.target.closest("a"))) void navigate(groupPath);
              }}>
                <th scope="row" className={styles.name}>
                  <Link to={groupPath}>{group.id}</Link>
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
