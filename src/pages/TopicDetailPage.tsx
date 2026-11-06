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
import styles from "./TopicDetailPage.module.css";

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
          <Link to={`/clusters/${encodeURIComponent(gateway.id)}/topics`}>Back to topics</Link>
        </main>
      );
    }
    return <main><ErrorWithRetry error={error} gateway={gateway} onRetry={() => void refetch()} /></main>;
  }
  if (detail === undefined) {
    return <main><p role="status">Loading topic…</p></main>;
  }
  return (
    <main>
      <Link to={`/clusters/${encodeURIComponent(gateway.id)}/topics`}>Back to topics</Link>
      <TopicTabs gateway={gateway} topicName={topicName} />
      <header className={styles.heading}>
        <div>
          <h2>{detail.name}</h2>
          <div className={styles.summary}>
            <span>{detail.partitions.length} {detail.partitions.length === 1 ? "partition" : "partitions"}</span>
            <span>{detail.config.length} configuration {detail.config.length === 1 ? "entry" : "entries"}</span>
          </div>
        </div>
        <DeleteTopic key={JSON.stringify([gateway.id, topicName])} gateway={gateway} topicName={topicName} deleteTopic={deleteTopic} confirmTopicDeletion={confirmTopicDeletion} />
      </header>
      <section aria-labelledby="topic-partitions-heading" className={styles.section}>
        <h3 id="topic-partitions-heading">Partitions</h3>
        {detail.partitions.length === 0 ? <p>No partitions reported.</p> : null}
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
      </section>
      <section aria-labelledby="topic-configuration-heading" className={styles.section}>
        <h3 id="topic-configuration-heading">Configuration</h3>
        {detail.config.length === 0 ? <p>No configuration entries reported.</p> : null}
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
      </section>
    </main>
  );
}
