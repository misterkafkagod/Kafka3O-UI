import type { ConsumerGroup } from "../gateway/types";
import { consumerLagStatusLabel } from "../groups/consumerLagStatusLabel";
import { ScrollableTableRegion } from "./ScrollableTableRegion";

type ConsumerGroupTopicOffsetsProps = {
  group: ConsumerGroup;
  topic: string;
};

export function ConsumerGroupTopicOffsets({ group, topic }: ConsumerGroupTopicOffsetsProps) {
  const partitions = group.partitions.filter((partition) => partition.topic === topic).sort((a, b) => a.partition - b.partition);
  return (
    <section aria-label={`Topic ${topic}`}>
      <h4>{topic}</h4>
      {partitions.length > 0 ? (
        <ScrollableTableRegion label={`Offsets for ${topic} table scroll area`}>
          <table aria-label={`Offsets for ${topic}`}>
            <thead>
              <tr>
                <th scope="col">Partition</th>
                <th scope="col">Committed offset</th>
                <th scope="col">Log start</th>
                <th scope="col">Log end</th>
                <th scope="col">Lag</th>
                <th scope="col">Status</th>
                <th scope="col">Error</th>
              </tr>
            </thead>
            <tbody>
              {partitions.map((partition) => (
                <tr key={partition.partition}>
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
        <p>{group.error ? "Partition offsets may be unavailable." : "No partition offsets."}</p>
      )}
    </section>
  );
}
