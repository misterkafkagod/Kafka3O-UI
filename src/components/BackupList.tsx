import { Fragment } from "react";
import { Link } from "react-router";
import type { TopicBackup } from "../gateway/listBackups";
import { formatBytes } from "../groups/formatBytes";
import styles from "./BackupList.module.css";
import { ScrollableTableRegion } from "./ScrollableTableRegion";

type BackupListProps = {
  backups: TopicBackup[];
  // gatewayId builds each topic's Backup tab link, where backups are started, changed and restored.
  gatewayId: string;
};

export function BackupList({ backups, gatewayId }: BackupListProps) {
  if (backups.length === 0) return <p>No backups yet.</p>;
  return (
    <ScrollableTableRegion label="Topic backups table scroll area">
      <table aria-label="Topic backups">
        <thead>
          <tr>
            <th scope="col">Topic</th>
            <th scope="col">State</th>
            <th scope="col">Location</th>
            <th scope="col">Last write</th>
            <th scope="col">Stored</th>
          </tr>
        </thead>
        <tbody>
          {backups.map((backup) => (
            <Fragment key={backup.connector}>
              <tr>
                <th scope="row">
                  <Link to={`/clusters/${encodeURIComponent(gatewayId)}/topics/${encodeURIComponent(backup.topic)}/backup`}>{backup.topic}</Link>
                </th>
                <td className={styles.state}>{backup.state ?? "Unknown"}</td>
                <td><code className={styles.location}>{backup.location}</code></td>
                <td>{backup.storage === undefined ? "Unknown" : backup.storage.lastWrite === null ? "Nothing written yet"
                  : new Date(backup.storage.lastWrite).toLocaleString()}</td>
                <td>{backup.storage === undefined ? "Unknown"
                  : `${formatBytes(backup.storage.storedBytes)} in ${backup.storage.objects} object${backup.storage.objects === 1 ? "" : "s"}`}</td>
              </tr>
              {backup.restore ? (
                <tr className={backup.restore.error ? styles.errorRow : styles.restoreRow}>
                  <td colSpan={5} aria-label={`Restore of ${backup.topic}`}>
                    {backup.restore.finished ? `Last restore finished: ${backup.restore.total} records restored.`
                      : backup.restore.error ? `Restore ${backup.restore.state === "FAILED" ? "failed" : "needs attention"}: ${backup.restore.error}`
                        : `Restoring ${backup.restore.restored} of ${backup.restore.total} records.`}
                  </td>
                </tr>
              ) : null}
              {backup.error ? (
                <tr className={styles.errorRow}>
                  <td colSpan={5} aria-label={`Error for ${backup.topic}`}>{backup.error}</td>
                </tr>
              ) : null}
            </Fragment>
          ))}
        </tbody>
      </table>
    </ScrollableTableRegion>
  );
}
