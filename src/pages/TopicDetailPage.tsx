import { Link } from "react-router";
import { ErrorWithRetry } from "../components/ErrorWithRetry";
import { DeleteTopic } from "../components/DeleteTopic";
import { ScrollableTableRegion } from "../components/ScrollableTableRegion";
import { TopicTabs } from "../components/TopicTabs";
import type { GetTopicDetail } from "../gateway/getTopicDetail";
import type { ConfirmTopicDeletion, DeleteTopic as DeleteAction } from "../gateway/deleteTopic";
import { HttpError } from "../gateway/HttpError";
import type { GatewayEntry } from "../gateway/types";
import { useTopicDetail } from "../hooks/useTopicDetail";

type TopicDetailPageProps = {
  gateway: GatewayEntry;
  topicName: string;
  getTopicDetail: GetTopicDetail;
  deleteTopic: DeleteAction;
  confirmTopicDeletion: ConfirmTopicDeletion;
};

export function TopicDetailPage({ gateway, topicName, getTopicDetail, deleteTopic, confirmTopicDeletion }: TopicDetailPageProps) {
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
    return <main><ErrorWithRetry error={error} onRetry={() => void refetch()} /></main>;
  }
  if (detail === undefined) {
    return <main><p role="status">Loading topic…</p></main>;
  }
  return (
    <main>
      <Link to={`/clusters/${gateway.id}/topics`}>Back to topics</Link>
      <TopicTabs gateway={gateway} topicName={topicName} />
      <h2>{detail.name}</h2>
      <DeleteTopic key={JSON.stringify([gateway.id, topicName])} gateway={gateway} topicName={topicName} deleteTopic={deleteTopic} confirmTopicDeletion={confirmTopicDeletion} />
      <h3>Partitions</h3>
      <ScrollableTableRegion label="Topic partitions table scroll area">
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
      </ScrollableTableRegion>
      <h3>Configuration</h3>
      <ScrollableTableRegion label="Topic configuration table scroll area">
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
      </ScrollableTableRegion>
    </main>
  );
}
