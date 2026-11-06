import { Link } from "react-router";
import type { ListConsumerGroups } from "../gateway/listConsumerGroups";
import type { GatewayEntry } from "../gateway/types";
import { topicConsumerGroups } from "../groups/topicConsumerGroups";
import { useConsumerGroups } from "../hooks/useConsumerGroups";
import { ConsumerGroupDetails } from "./ConsumerGroupDetails";
import { ErrorWithRetry } from "./ErrorWithRetry";
import { TopicTabs } from "./TopicTabs";

type TopicConsumerGroupsProps = {
  gateway: GatewayEntry;
  topicName: string;
  listConsumerGroups: ListConsumerGroups;
};

export function TopicConsumerGroups({ gateway, topicName, listConsumerGroups }: TopicConsumerGroupsProps) {
  const { data: groups, isError, error, refetch } = useConsumerGroups(gateway, listConsumerGroups);
  const filtered = groups === undefined ? undefined : topicConsumerGroups(groups, topicName);

  return (
    <main>
      <Link to={`/clusters/${encodeURIComponent(gateway.id)}/topics`}>Back to topics</Link>
      <TopicTabs gateway={gateway} topicName={topicName} />
      <h2>{topicName}</h2>
      <h3>Consumers</h3>
      {isError ? (
        <ErrorWithRetry error={error} onRetry={() => void refetch()} />
      ) : filtered === undefined ? (
        <p role="status">Loading consumer groups…</p>
      ) : (
        <>
          {filtered.associated.length === 0 ? (
            <p>{filtered.unresolved.length > 0 ? "No known consumer groups for this topic." : "No consumer groups for this topic."}</p>
          ) : (
            filtered.associated.map((group) => (
              <ConsumerGroupDetails key={group.id} group={group} onRetry={() => void refetch()} />
            ))
          )}
          {filtered.unresolved.map((group) => (
            <div role="alert" key={group.id}>
              <p>Could not determine whether group "{group.id}" consumes this topic: {group.error}</p>
              <button type="button" onClick={() => void refetch()}>Retry group data</button>
            </div>
          ))}
        </>
      )}
    </main>
  );
}
