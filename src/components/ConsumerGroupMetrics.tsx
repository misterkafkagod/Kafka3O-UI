import { Link } from "react-router";
import type { ClusterMetrics } from "../gateway/getMetrics";
import styles from "./PartitionHealth.module.css";
import { ScrollableTableRegion } from "./ScrollableTableRegion";

type ConsumerGroupMetricsProps = {
  gatewayId: string;
  consumerGroups: NonNullable<ClusterMetrics["consumerGroups"]>;
};

export function ConsumerGroupMetrics({ gatewayId, consumerGroups }: ConsumerGroupMetricsProps) {
  return (
    <section aria-labelledby="consumer-group-metrics">
      <h3 id="consumer-group-metrics">Consumer groups</h3>
      {consumerGroups.error ? (
        <p role="alert">Unavailable: {consumerGroups.error}</p>
      ) : consumerGroups.groups.length === 0 ? (
        <p>No consumer groups.</p>
      ) : (
        <>
          <dl className={styles.stats}>
            {consumerGroups.states.map((state) => (
              <div key={state.state}>
                <dt>{state.state}</dt>
                <dd>{state.count}</dd>
              </div>
            ))}
          </dl>
          <ScrollableTableRegion label="Consumer group lag table scroll area">
            <table aria-label="Consumer group lag">
              <thead>
                <tr><th scope="col">Group</th><th scope="col">State</th><th scope="col">Members</th><th scope="col">Total lag</th><th scope="col">Largest partition lag</th></tr>
              </thead>
              <tbody>
                {consumerGroups.groups.map((group) => (
                  <tr key={group.group}>
                    <th scope="row">
                      <Link to={`/clusters/${encodeURIComponent(gatewayId)}/consumer-groups/${encodeURIComponent(group.group)}`}>{group.group}</Link>
                    </th>
                    <td>{group.state}</td>
                    <td>{group.members}</td>
                    <td>{group.error ? `Unavailable: ${group.error}`
                      : group.lag === null ? (group.unknownPartitions > 0 ? `Unknown (${group.unknownPartitions} partition${group.unknownPartitions === 1 ? "" : "s"})` : "No partitions")
                        : group.unknownPartitions > 0 ? `At least ${group.lag} (${group.unknownPartitions} partition${group.unknownPartitions === 1 ? "" : "s"} unknown)` : group.lag}</td>
                    <td>{group.maxPartitionLag === null || group.error ? "" : group.maxPartitionLag}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollableTableRegion>
        </>
      )}
    </section>
  );
}
