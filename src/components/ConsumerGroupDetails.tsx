import type { OffsetResetActions } from "../gateway/OffsetResetActions";
import type { ConsumerGroup } from "../gateway/types";
import { consumerGroupAnchor } from "../groups/consumerGroupAnchor";
import { consumerLagStatusLabel } from "../groups/consumerLagStatusLabel";
import { ConsumerGroupMembers } from "./ConsumerGroupMembers";
import { OffsetResetPreview } from "./OffsetResetPreview";
import { ScrollableTableRegion } from "./ScrollableTableRegion";
import styles from "./ConsumerGroupDetails.module.css";

type ConsumerGroupDetailsProps = {
  group: ConsumerGroup;
  onRetry: () => void;
  // offsetReset enables the reset section on the cluster's consumer group page.
  offsetReset?: { gatewayUrl: string; actions: OffsetResetActions };
};

export function ConsumerGroupDetails({ group, onRetry, offsetReset }: ConsumerGroupDetailsProps) {
  return (
    <section id={consumerGroupAnchor(group.id)} tabIndex={-1} aria-label={`Consumer group ${group.id}`} className={styles.detail}>
      <h3>{group.id}</h3>
      <p>State: {group.state || "Unknown"} · Protocol: {group.protocol}</p>
      {group.error ? (
        <div role="alert">
          <p>Group data may be incomplete: {group.error}</p>
          <button type="button" onClick={onRetry}>Retry group data</button>
        </div>
      ) : null}
      <ConsumerGroupMembers group={group} />
      {group.partitions.length > 0 ? (
        <ScrollableTableRegion label={`Partition lag for ${group.id} table scroll area`}>
          <table aria-label={`Partition lag for ${group.id}`}>
            <thead>
              <tr>
                <th scope="col">Topic</th>
                <th scope="col">Partition</th>
                <th scope="col">Committed offset</th>
                <th scope="col">Start offset</th>
                <th scope="col">End offset</th>
                <th scope="col">Lag</th>
                <th scope="col">Status</th>
                <th scope="col">Error</th>
              </tr>
            </thead>
            <tbody>
              {group.partitions.map((partition) => (
                <tr key={`${partition.topic}:${partition.partition}`}>
                  <td>{partition.topic}</td>
                  <td>{partition.partition}</td>
                  <td>{partition.committedOffset ?? "—"}</td>
                  <td>{partition.startOffset ?? "—"}</td>
                  <td>{partition.endOffset ?? "—"}</td>
                  <td>{partition.lag ?? "—"}</td>
                  <td>{consumerLagStatusLabel(partition.status)}</td>
                  <td>{partition.error ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollableTableRegion>
      ) : (
        <p>{group.error ? "Partition lag may be unavailable." : "No partition offsets."}</p>
      )}
      {offsetReset ? <OffsetResetPreview gatewayUrl={offsetReset.gatewayUrl} group={group} actions={offsetReset.actions} onApplied={onRetry} /> : null}
    </section>
  );
}
