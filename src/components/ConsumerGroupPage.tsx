import { Link } from "react-router";
import type { ListConsumerGroups } from "../gateway/listConsumerGroups";
import type { OffsetResetActions } from "../gateway/OffsetResetActions";
import type { GatewayEntry } from "../gateway/types";
import { useConsumerGroups } from "../hooks/useConsumerGroups";
import { ConsumerGroupMembers } from "./ConsumerGroupMembers";
import { ConsumerGroupTopicOffsets } from "./ConsumerGroupTopicOffsets";
import { ErrorWithRetry } from "./ErrorWithRetry";
import { OffsetResetPreview } from "./OffsetResetPreview";
import styles from "./ConsumerGroupPage.module.css";

type ConsumerGroupPageProps = {
  gateway: GatewayEntry;
  groupId: string;
  listConsumerGroups: ListConsumerGroups;
  offsetReset?: OffsetResetActions;
};

export function ConsumerGroupPage({ gateway, groupId, listConsumerGroups, offsetReset }: ConsumerGroupPageProps) {
  const { data: groups, isError, error, refetch } = useConsumerGroups(gateway, listConsumerGroups);
  const listPath = `/clusters/${encodeURIComponent(gateway.id)}/consumer-groups`;
  const group = groups?.find((candidate) => candidate.id === groupId);
  const topics = group ? [...new Set([...group.topics, ...group.partitions.map((partition) => partition.topic)])].sort() : [];

  return (
    <main>
      <Link to={listPath}>Back to consumer groups</Link>
      <h2 className={styles.name}>{groupId}</h2>
      {isError ? (
        <ErrorWithRetry error={error} gateway={gateway} onRetry={() => void refetch()} />
      ) : groups === undefined ? (
        <p role="status">Loading consumer group…</p>
      ) : group === undefined ? (
        <p>Consumer group not found. <Link to={listPath}>Show all consumer groups</Link></p>
      ) : (
        <>
          <p>State: {group.state || "Unknown"} · Protocol: {group.protocol}</p>
          {group.error ? (
            <div role="alert">
              <p>Group data may be incomplete: {group.error}</p>
              <button type="button" onClick={() => void refetch()}>Retry group data</button>
            </div>
          ) : null}
          <h3>Members</h3>
          <ConsumerGroupMembers group={group} />
          <h3>Offsets by topic</h3>
          {topics.length > 0 ? (
            topics.map((topic) => <ConsumerGroupTopicOffsets key={topic} group={group} topic={topic} />)
          ) : (
            <p>{group.error ? "Partition offsets may be unavailable." : "No partition offsets."}</p>
          )}
          {offsetReset ? (
            <OffsetResetPreview gatewayUrl={gateway.url} group={group} actions={offsetReset} onApplied={() => void refetch()} />
          ) : null}
        </>
      )}
    </main>
  );
}
