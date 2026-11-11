import { Link } from "react-router";
import type { ClusterMetrics } from "../gateway/getMetrics";
import { formatBytes } from "../groups/formatBytes";
import { formatAge } from "../metrics/formatAge";
import styles from "./PartitionHealth.module.css";
import { ScrollableTableRegion } from "./ScrollableTableRegion";

type BackupMetricsProps = {
  gatewayId: string;
  readAt: string;
  backups: NonNullable<ClusterMetrics["backups"]>;
};

export function BackupMetrics({ gatewayId, readAt, backups }: BackupMetricsProps) {
  return (
    <section aria-labelledby="backup-metrics">
      <h3 id="backup-metrics">Backups</h3>
      {backups.notConfigured ? (
        <p role="status">Backups are not configured for this cluster.</p>
      ) : backups.error ? (
        <p role="alert">Unavailable: {backups.error}</p>
      ) : backups.backups.length === 0 ? (
        <p>No backups yet.</p>
      ) : (
        <ScrollableTableRegion label="Backup health table scroll area">
          <table aria-label="Backup health">
            <thead>
              <tr><th scope="col">Topic</th><th scope="col">State</th><th scope="col">Last write</th><th scope="col">Stored</th><th scope="col">Restore</th></tr>
            </thead>
            <tbody>
              {backups.backups.map((backup) => (
                <tr key={backup.topic} className={backup.state !== "RUNNING" ? styles.problem : undefined}>
                  <th scope="row">
                    <Link to={`/clusters/${encodeURIComponent(gatewayId)}/topics/${encodeURIComponent(backup.topic)}/backup`}>{backup.topic}</Link>
                  </th>
                  <td>{backup.error ? `${backup.state}: ${backup.error}` : backup.state}</td>
                  <td>{!backup.storageListed ? "Unknown" : backup.lastWrite === null ? "Nothing written yet" : `${formatAge(backup.lastWrite, readAt)} ago`}</td>
                  <td>{backup.storedBytes === null ? "Unknown" : `${formatBytes(backup.storedBytes)} in ${backup.objects} object${backup.objects === 1 ? "" : "s"}`}</td>
                  <td>{backup.restoring ? "Running" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollableTableRegion>
      )}
    </section>
  );
}
