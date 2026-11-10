import type { ListConsumerGroups } from "../gateway/listConsumerGroups";
import type { PreviewOffsetReset } from "../gateway/previewOffsetReset";
import type { GatewayEntry } from "../gateway/types";
import { useConsumerGroups } from "../hooks/useConsumerGroups";
import { ConsumerGroupDetails } from "./ConsumerGroupDetails";
import { ConsumerGroupSummary } from "./ConsumerGroupSummary";
import { ErrorWithRetry } from "./ErrorWithRetry";

type ConsumerGroupsProps = {
  gateway: GatewayEntry;
  listConsumerGroups: ListConsumerGroups;
  previewOffsetReset?: PreviewOffsetReset;
};

export function ConsumerGroups({ gateway, listConsumerGroups, previewOffsetReset }: ConsumerGroupsProps) {
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
          <ConsumerGroupSummary groups={groups} />
          {groups.map((group) => (
            <ConsumerGroupDetails key={group.id} group={group} onRetry={() => void refetch()}
              offsetReset={previewOffsetReset ? { gatewayUrl: gateway.url, previewOffsetReset } : undefined} />
          ))}
        </>
      )}
    </main>
  );
}
