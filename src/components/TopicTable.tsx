import type { Topic } from "../gateway/types";

export function TopicTable({ topics }: { topics: Topic[] }) {
  return (
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
            <td>{topic.name}</td>
            <td>{topic.partitions}</td>
            <td>{topic.replicationFactor}</td>
            <td>~{topic.approxMessages}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
