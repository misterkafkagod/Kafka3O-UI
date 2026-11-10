import type { ListConsumerGroups } from "../gateway/listConsumerGroups";
import type { OffsetResetActions } from "../gateway/OffsetResetActions";
import type { GatewayEntry } from "../gateway/types";
import { useConsumerGroups } from "../hooks/useConsumerGroups";
import { ConsumerGroupDetails } from "./ConsumerGroupDetails";
import { ConsumerGroupList } from "./ConsumerGroupList";
import { ErrorWithRetry } from "./ErrorWithRetry";

type ConsumerGroupsProps = {
  gateway: GatewayEntry;
  listConsumerGroups: ListConsumerGroups;
  offsetReset?: OffsetResetActions;
};

export function ConsumerGroups({ gateway, listConsumerGroups, offsetReset }: ConsumerGroupsProps) {
  const { data: groups, isError, error, refetch } = useConsumerGroups(gateway, listConsumerGroups);

  return (
    <main>
      <h2>Consumer groups</h2>
      {isError ? (
        <ErrorWithRetry error={error} gateway={gateway} onRetry={() => void refetch()} />
      ) : groups === undefined ? (
        <p role="status">Loading consumer groups…</p>
      ) : groups.length === 0 ? (
        <p>No consumer groups.</p>
      ) : (
        <>
          <ConsumerGroupList groups={groups} />
          {groups.map((group) => (
            <ConsumerGroupDetails key={group.id} group={group} onRetry={() => void refetch()}
              offsetReset={offsetReset ? { gatewayUrl: gateway.url, actions: offsetReset } : undefined} />
          ))}
        </>
      )}
    </main>
  );
}
