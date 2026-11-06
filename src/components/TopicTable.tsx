import { Link } from "react-router";
import type { Topic } from "../gateway/types";
import { ScrollableTableRegion } from "./ScrollableTableRegion";

export function TopicTable({ gatewayId, topics }: { gatewayId: string; topics: Topic[] }) {
  return (
    <ScrollableTableRegion label="Topics table scroll area">
      <table aria-label="Topics">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Partitions</th>
            <th scope="col">Replication</th>
            <th scope="col">Messages</th>
          </tr>
        </thead>
        <tbody>
          {topics.map((topic) => (
            <tr key={topic.name}>
              <td>
                <Link to={`/clusters/${encodeURIComponent(gatewayId)}/topics/${encodeURIComponent(topic.name)}`}>{topic.name}</Link>
              </td>
              <td>{topic.partitions}</td>
              <td>{topic.replicationFactor}</td>
              <td>~{topic.approxMessages}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollableTableRegion>
  );
}
