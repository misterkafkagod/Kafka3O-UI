import type { ConsumerGroup } from "../gateway/types";
import { consumerLagStatusLabel } from "../groups/consumerLagStatusLabel";

type ConsumerGroupDetailsProps = {
  group: ConsumerGroup;
  onRetry: () => void;
};

export function ConsumerGroupDetails({ group, onRetry }: ConsumerGroupDetailsProps) {
  return (
    <section aria-label={`Consumer group ${group.id}`}>
      <h3>{group.id}</h3>
      <p>State: {group.state || "Unknown"} · Protocol: {group.protocol}</p>
      {group.error ? (
        <div role="alert">
          <p>Group data may be incomplete: {group.error}</p>
          <button type="button" onClick={onRetry}>Retry group data</button>
        </div>
      ) : null}
      {group.members.length > 0 ? (
        <table aria-label={`Members of ${group.id}`}>
          <thead>
            <tr>
              <th scope="col">Member</th>
              <th scope="col">Client</th>
              <th scope="col">Host</th>
              <th scope="col">Instance</th>
            </tr>
          </thead>
          <tbody>
            {group.members.map((member) => (
              <tr key={member.id}>
                <td>{member.id}</td>
                <td>{member.clientId}</td>
                <td>{member.clientHost}</td>
                <td>{member.instanceId ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>{group.error ? "Member information may be unavailable." : "No active members."}</p>
      )}
      {group.partitions.length > 0 ? (
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
      ) : (
        <p>{group.error ? "Partition lag may be unavailable." : "No partition offsets."}</p>
      )}
    </section>
  );
}
