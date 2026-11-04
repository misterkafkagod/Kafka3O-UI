import { Link } from "react-router";
import { ErrorWithRetry } from "../components/ErrorWithRetry";
import type { GetTopicDetail } from "../gateway/getTopicDetail";
import { HttpError } from "../gateway/HttpError";
import type { GatewayEntry } from "../gateway/types";
import { useTopicDetail } from "../hooks/useTopicDetail";

type TopicDetailPageProps = {
  gateway: GatewayEntry;
  topicName: string;
  getTopicDetail: GetTopicDetail;
};

export function TopicDetailPage({ gateway, topicName, getTopicDetail }: TopicDetailPageProps) {
  const { data: detail, isError, error, refetch } = useTopicDetail(gateway, topicName, getTopicDetail);

  if (isError) {
    if (error instanceof HttpError && error.status === 404) {
      return (
        <main>
          <h2>Topic not found</h2>
          <p>Topic "{topicName}" no longer exists on this cluster.</p>
          <Link to={`/clusters/${gateway.id}/topics`}>Back to topics</Link>
        </main>
      );
    }
    return <ErrorWithRetry error={error} onRetry={() => void refetch()} />;
  }
  if (detail === undefined) {
    return <p>Loading topic…</p>;
  }
  return (
    <main>
      <Link to={`/clusters/${gateway.id}/topics`}>Back to topics</Link>
      <h2>{detail.name}</h2>
      <h3>Partitions</h3>
      <table aria-label="Topic partitions">
        <thead>
          <tr>
            <th scope="col">Partition</th>
            <th scope="col">Leader</th>
            <th scope="col">Replicas</th>
            <th scope="col">ISR</th>
            <th scope="col">Start offset</th>
            <th scope="col">End offset</th>
          </tr>
        </thead>
        <tbody>
          {detail.partitions.map((partition) => (
            <tr key={partition.id}>
              <td>{partition.id}</td>
              <td>{partition.leader}</td>
              <td>{partition.replicas.join(", ")}</td>
              <td>{partition.isr.join(", ")}</td>
              <td>{partition.startOffset}</td>
              <td>{partition.endOffset}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>Configuration</h3>
      <table aria-label="Topic configuration">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Value</th>
          </tr>
        </thead>
        <tbody>
          {detail.config.map((entry) => (
            <tr key={entry.name}>
              <td>{entry.name}</td>
              <td>{entry.sensitive ? "Sensitive value hidden" : entry.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
