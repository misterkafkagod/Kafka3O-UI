import type { Quorum } from "../gateway/getMetrics";
import styles from "./PartitionHealth.module.css";
import { ScrollableTableRegion } from "./ScrollableTableRegion";

type QuorumHealthProps = {
  quorum: Quorum;
};

export function QuorumHealth({ quorum }: QuorumHealthProps) {
  return (
    <section aria-labelledby="quorum-health">
      <h3 id="quorum-health">Controller quorum</h3>
      {quorum.error ? (
        <p role="alert">Unavailable: {quorum.error}</p>
      ) : (
        <>
          <dl className={styles.stats}>
            <div className={quorum.leaderId === null ? styles.problem : undefined}>
              <dt>Leader</dt>
              <dd>{quorum.leaderId === null ? "None" : quorum.leaderId}</dd>
            </div>
            <div>
              <dt>Leader epoch</dt>
              <dd>{quorum.leaderEpoch}</dd>
            </div>
            <div>
              <dt>High watermark</dt>
              <dd>{quorum.highWatermark}</dd>
            </div>
          </dl>
          <ScrollableTableRegion label="Controller quorum table scroll area">
            <table aria-label="Controller quorum replicas">
              <thead>
                <tr><th scope="col">Replica</th><th scope="col">Role</th><th scope="col">Log end offset</th><th scope="col">Lag</th><th scope="col">Last fetch</th></tr>
              </thead>
              <tbody>
                {quorum.replicas.map((replica) => (
                  <tr key={`${replica.role}-${replica.id}`} className={replica.lag ? styles.problem : undefined}>
                    <th scope="row">{replica.id}{replica.id === quorum.leaderId ? " (leader)" : ""}</th>
                    <td>{replica.role === "voter" ? "Voter" : "Observer"}</td>
                    <td>{replica.logEndOffset}</td>
                    <td>{replica.lag === null ? "Unknown" : replica.lag}</td>
                    <td>{replica.lastFetch === null ? "Unknown" : new Date(replica.lastFetch).toLocaleString()}</td>
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
