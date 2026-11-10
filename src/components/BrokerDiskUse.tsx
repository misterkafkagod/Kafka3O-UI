import type { ClusterMetrics } from "../gateway/getMetrics";
import { formatBytes } from "../groups/formatBytes";
import { ScrollableTableRegion } from "./ScrollableTableRegion";
import styles from "./BrokerDiskUse.module.css";

type BrokerDiskUseProps = {
  logDirs: ClusterMetrics["logDirs"];
};

export function BrokerDiskUse({ logDirs }: BrokerDiskUseProps) {
  return (
    <section aria-labelledby="broker-disk-use">
      <h3 id="broker-disk-use">Broker disk use</h3>
      <p className={styles.note}>Total, used and free are for the volume that holds each log directory, which other data may share.</p>
      {logDirs.error ? <p role="alert">Unavailable: {logDirs.error}</p> : null}
      {logDirs.dirs.length > 0 ? (
        <ScrollableTableRegion label="Broker disk use table scroll area">
          <table aria-label="Broker disk use" className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Broker</th>
                <th scope="col">Log directory</th>
                <th scope="col">Total</th>
                <th scope="col">Used</th>
                <th scope="col">Free</th>
                <th scope="col">% used</th>
                <th scope="col">Kafka data</th>
              </tr>
            </thead>
            <tbody>
              {logDirs.dirs.map((dir) => {
                const known = dir.totalBytes !== null && dir.usableBytes !== null;
                const used = known ? dir.totalBytes! - dir.usableBytes! : null;
                return (
                  <tr key={`${dir.broker}:${dir.dir}`}>
                    <td>{dir.broker}</td>
                    <td className={styles.path}>{dir.dir}</td>
                    {dir.error ? (
                      <td colSpan={5} className={styles.error}>Unavailable: {dir.error}</td>
                    ) : (
                      <>
                        <td>{dir.totalBytes === null ? "Unknown" : formatBytes(dir.totalBytes)}</td>
                        <td>{used === null ? "Unknown" : formatBytes(used)}</td>
                        <td>{dir.usableBytes === null ? "Unknown" : formatBytes(dir.usableBytes)}</td>
                        <td>{used === null || dir.totalBytes === 0 ? "Unknown" : `${((used / dir.totalBytes!) * 100).toFixed(1)}%`}</td>
                        <td>{formatBytes(dir.kafkaBytes)}</td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ScrollableTableRegion>
      ) : logDirs.error ? null : (
        <p>No log directories reported.</p>
      )}
    </section>
  );
}
