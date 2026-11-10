import { Fragment } from "react";
import type { TopicBackup } from "../gateway/listBackups";
import { formatBytes } from "../groups/formatBytes";
import styles from "./BackupList.module.css";
import { ScrollableTableRegion } from "./ScrollableTableRegion";

export function BackupList({ backups }: { backups: TopicBackup[] }) {
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
                <th scope="row">{backup.topic}</th>
                <td>{backup.state ?? "Unknown"}</td>
                <td><code className={styles.location}>{backup.location}</code></td>
                <td>{backup.storage === undefined ? "Unknown" : backup.storage.lastWrite === null ? "Nothing written yet"
                  : new Date(backup.storage.lastWrite).toLocaleString()}</td>
                <td>{backup.storage === undefined ? "Unknown"
                  : `${formatBytes(backup.storage.storedBytes)} in ${backup.storage.objects} object${backup.storage.objects === 1 ? "" : "s"}`}</td>
              </tr>
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
