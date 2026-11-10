import { HttpError } from "../gateway/HttpError";
import type { ListBackups } from "../gateway/listBackups";
import type { ListTopics } from "../gateway/listTopics";
import type { BackupActions } from "../gateway/startBackup";
import type { GatewayEntry } from "../gateway/types";
import { useBackups } from "../hooks/useBackups";
import { BackupList } from "./BackupList";
import { ErrorWithRetry } from "./ErrorWithRetry";
import { StartBackup } from "./StartBackup";

type ClusterBackupsProps = {
  gateway: GatewayEntry;
  listTopics: ListTopics;
  listBackups: ListBackups;
  actions?: BackupActions;
};

export function ClusterBackups({ gateway, listTopics, listBackups, actions }: ClusterBackupsProps) {
  const { data: backups, isError, error, refetch } = useBackups(gateway, listBackups);
  const code = error instanceof HttpError ? error.problem?.code : undefined;

  return (
    <main>
      <h2>Backups</h2>
      <p>Backups copy a topic's messages continuously to the cluster's S3 backup storage through Kafka Connect.</p>
      {isError && code === "backups_not_configured" ? (
        <p role="status">Backups are not configured for this cluster.</p>
      ) : isError && code === "connect_unreachable" ? (
        <div role="alert">
          <p>Kafka Connect is unreachable, so backups cannot be listed.</p>
          <button type="button" onClick={() => void refetch()}>Retry</button>
        </div>
      ) : isError ? (
        <ErrorWithRetry error={error} gateway={gateway} onRetry={() => void refetch()} />
      ) : backups === undefined ? (
        <p role="status">Loading backups…</p>
      ) : (
        <>
          <BackupList backups={backups} gatewayUrl={gateway.url} actions={actions} onChanged={() => void refetch()} />
          {actions ? <StartBackup gateway={gateway} listTopics={listTopics} actions={actions} onStarted={() => void refetch()} backedUp={backups.map((backup) => backup.topic)} /> : null}
        </>
      )}
    </main>
  );
}
