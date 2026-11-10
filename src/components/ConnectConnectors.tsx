import { Fragment } from "react";
import { HttpError } from "../gateway/HttpError";
import type { ListConnectors } from "../gateway/listConnectors";
import type { GatewayEntry } from "../gateway/types";
import { useConnectors } from "../hooks/useConnectors";
import styles from "./ConnectConnectors.module.css";
import { ErrorWithRetry } from "./ErrorWithRetry";
import { ScrollableTableRegion } from "./ScrollableTableRegion";

type ConnectConnectorsProps = {
  gateway: GatewayEntry;
  listConnectors: ListConnectors;
};

export function ConnectConnectors({ gateway, listConnectors }: ConnectConnectorsProps) {
  const { data: connectors, isError, error, refetch, isFetching } = useConnectors(gateway, listConnectors);
  const code = error instanceof HttpError ? error.problem?.code : undefined;

  return (
    <main>
      <h2>Kafka Connect</h2>
      {isError && code === "connect_not_configured" ? (
        <p role="status">Kafka Connect is not configured for this cluster.</p>
      ) : isError && code === "connect_unreachable" ? (
        <div role="alert">
          <p>Kafka Connect is unreachable.</p>
          <button type="button" onClick={() => void refetch()}>Retry</button>
        </div>
      ) : isError ? (
        <ErrorWithRetry error={error} gateway={gateway} onRetry={() => void refetch()} />
      ) : connectors === undefined ? (
        <p role="status">Loading connectors…</p>
      ) : connectors.length === 0 ? (
        <p>No connectors.</p>
      ) : (
        <>
          <div className={styles.toolbar}>
            <p>{connectors.length} connector{connectors.length === 1 ? "" : "s"}</p>
            <button type="button" onClick={() => void refetch()} disabled={isFetching}>{isFetching ? "Refreshing…" : "Refresh"}</button>
          </div>
          <ScrollableTableRegion label="Kafka Connect connectors table scroll area">
            <table aria-label="Kafka Connect connectors">
              <thead>
                <tr>
                  <th scope="col">Connector</th>
                  <th scope="col">Type</th>
                  <th scope="col">State</th>
                  <th scope="col">Worker</th>
                  <th scope="col">Tasks</th>
                </tr>
              </thead>
              <tbody>
                {connectors.map((connector) => {
                  const errors = [
                    ...(connector.error ? [`Connector: ${connector.error}`] : []),
                    ...connector.tasks.filter((task) => task.error).map((task) => `Task ${task.id}: ${task.error}`),
                  ];
                  return (
                    <Fragment key={connector.name}>
                      <tr>
                        <th scope="row">{connector.name}</th>
                        <td>{connector.type || "—"}</td>
                        <td>{connector.state}</td>
                        <td>{connector.workerId || "—"}</td>
                        <td>
                          {connector.tasks.length === 0 ? "No tasks" : (
                            <ul className={styles.tasks}>
                              {connector.tasks.map((task) => <li key={task.id}>Task {task.id}: {task.state}</li>)}
                            </ul>
                          )}
                        </td>
                      </tr>
                      {errors.length > 0 ? (
                        <tr className={styles.errorRow}>
                          <td colSpan={5}>
                            <ul aria-label={`Errors for ${connector.name}`} className={styles.errors}>
                              {errors.map((message) => <li key={message}>{message}</li>)}
                            </ul>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </ScrollableTableRegion>
        </>
      )}
    </main>
  );
}
