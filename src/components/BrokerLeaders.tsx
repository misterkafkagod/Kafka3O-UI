import type { ClusterMetrics } from "../gateway/getMetrics";
import styles from "./PartitionHealth.module.css";
import { ScrollableTableRegion } from "./ScrollableTableRegion";

type BrokerLeadersProps = {
  brokers: NonNullable<ClusterMetrics["brokers"]>;
};

export function BrokerLeaders({ brokers }: BrokerLeadersProps) {
  return (
    <section aria-labelledby="broker-leaders">
      <h3 id="broker-leaders">Partition leaders per broker</h3>
      {brokers.error ? (
        <p role="alert">Unavailable: {brokers.error}</p>
      ) : (
        <ScrollableTableRegion label="Partition leaders table scroll area">
          <table aria-label="Partition leaders per broker">
            <thead>
              <tr><th scope="col">Broker</th><th scope="col">Leaders</th><th scope="col">Replicas</th><th scope="col">Not preferred leader</th></tr>
            </thead>
            <tbody>
              {brokers.brokers.map((broker) => (
                <tr key={broker.broker} className={broker.nonPreferredLeaders ? styles.problem : undefined}>
                  <th scope="row">{broker.broker}</th>
                  <td>{broker.leaders}</td>
                  <td>{broker.replicas}</td>
                  <td>{broker.nonPreferredLeaders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollableTableRegion>
      )}
    </section>
  );
}
