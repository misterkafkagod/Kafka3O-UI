import type { ClusterMetrics } from "../gateway/getMetrics";
import styles from "./PartitionHealth.module.css";

type PartitionHealthProps = {
  partitions: ClusterMetrics["partitions"];
};

export function PartitionHealth({ partitions }: PartitionHealthProps) {
  const problems = [
    { label: "Under-replicated", value: partitions.underReplicated },
    { label: "Below min ISR", value: partitions.belowMinIsr },
    { label: "Offline", value: partitions.offline },
  ];
  return (
    <section aria-labelledby="partition-health">
      <h3 id="partition-health">Partition health</h3>
      {partitions.error ? (
        <p role="alert">Unavailable: {partitions.error}</p>
      ) : (
        <>
          <dl className={styles.stats}>
            <div>
              <dt>Topics</dt>
              <dd>{partitions.topics}</dd>
            </div>
            <div>
              <dt>Partitions</dt>
              <dd>{partitions.partitions}</dd>
            </div>
            {problems.map((problem) => (
              <div key={problem.label} className={problem.value ? styles.problem : undefined}>
                <dt>{problem.label}</dt>
                <dd>{problem.value === null ? "Unknown" : problem.value}</dd>
              </div>
            ))}
          </dl>
          {partitions.belowMinIsr === null && partitions.minIsrError ? <p>Below min ISR is unknown: {partitions.minIsrError}</p> : null}
          {partitions.unreadableTopics.length > 0 ? (
            <p role="alert">Not counted, because Kafka did not describe them: {partitions.unreadableTopics.join(", ")}</p>
          ) : null}
        </>
      )}
    </section>
  );
}
