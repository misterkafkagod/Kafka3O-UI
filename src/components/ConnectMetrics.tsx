import type { ClusterMetrics, StateCount } from "../gateway/getMetrics";
import styles from "./PartitionHealth.module.css";

type ConnectMetricsProps = {
  connect: NonNullable<ClusterMetrics["connect"]>;
};

export function ConnectMetrics({ connect }: ConnectMetricsProps) {
  const counts: [label: string, states: StateCount[]][] = [["Connectors", connect.connectors], ["Tasks", connect.tasks]];
  return (
    <section aria-labelledby="connect-metrics">
      <h3 id="connect-metrics">Kafka Connect</h3>
      {connect.notConfigured ? (
        <p role="status">Kafka Connect is not configured for this cluster.</p>
      ) : connect.error ? (
        <p role="alert">Unavailable: {connect.error}</p>
      ) : (
        <>
          {counts.map(([label, states]) => (
            <dl key={label} className={styles.stats} aria-label={label}>
              {states.length === 0 ? (
                <div><dt>{label}</dt><dd>0</dd></div>
              ) : states.map((state) => (
                <div key={state.state} className={state.state === "FAILED" ? styles.problem : undefined}>
                  <dt>{`${label} ${state.state.toLowerCase()}`}</dt>
                  <dd>{state.count}</dd>
                </div>
              ))}
            </dl>
          ))}
          {connect.failures.length > 0 ? (
            <ul aria-label="Kafka Connect failures">
              {connect.failures.map((failure) => (
                <li key={`${failure.connector}-${failure.task ?? "connector"}`}>
                  {failure.task === null ? failure.connector : `${failure.connector} task ${failure.task}`}: {failure.error || "failed"}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}
    </section>
  );
}
