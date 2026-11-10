import type { ListTopics } from "../gateway/listTopics";
import type { BackupActions } from "../gateway/startBackup";
import type { GatewayEntry } from "../gateway/types";
import { StartBackup } from "./StartBackup";

type ClusterBackupsProps = {
  gateway: GatewayEntry;
  listTopics: ListTopics;
  actions?: BackupActions;
};

export function ClusterBackups({ gateway, listTopics, actions }: ClusterBackupsProps) {
  return (
    <main>
      <h2>Backups</h2>
      <p>Backups copy a topic's messages continuously to the cluster's S3 backup storage through Kafka Connect.</p>
      {actions ? <StartBackup gateway={gateway} listTopics={listTopics} actions={actions} /> : (
        <p role="status">Backups are not available in this console.</p>
      )}
    </main>
  );
}
