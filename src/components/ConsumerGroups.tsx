import type { ListConsumerGroups } from "../gateway/listConsumerGroups";
import type { GatewayEntry } from "../gateway/types";
import { useConsumerGroups } from "../hooks/useConsumerGroups";
import { ConsumerGroupDetails } from "./ConsumerGroupDetails";
import { ErrorWithRetry } from "./ErrorWithRetry";

type ConsumerGroupsProps = {
  gateway: GatewayEntry;
  listConsumerGroups: ListConsumerGroups;
};

export function ConsumerGroups({ gateway, listConsumerGroups }: ConsumerGroupsProps) {
  const { data: groups, isError, error, refetch } = useConsumerGroups(gateway, listConsumerGroups);

  return (
    <main>
      <h2>Consumer groups</h2>
      {isError ? (
        <ErrorWithRetry error={error} onRetry={() => void refetch()} />
      ) : groups === undefined ? (
        <p role="status">Loading consumer groups…</p>
      ) : groups.length === 0 ? (
        <p>No consumer groups.</p>
      ) : (
        groups.map((group) => <ConsumerGroupDetails key={group.id} group={group} onRetry={() => void refetch()} />)
      )}
    </main>
  );
}
