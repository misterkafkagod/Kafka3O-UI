import { Fragment, useEffect, useRef, useState } from "react";
import { describeConnectorActionError } from "../gateway/describeConnectorActionError";
import { HttpError } from "../gateway/HttpError";
import type { ListConnectors } from "../gateway/listConnectors";
import type { ConnectorAction, ConnectorActions } from "../gateway/runConnectorAction";
import type { GatewayEntry } from "../gateway/types";
import { useConnectors } from "../hooks/useConnectors";
import styles from "./ConnectConnectors.module.css";
import { ErrorWithRetry } from "./ErrorWithRetry";
import { ScrollableTableRegion } from "./ScrollableTableRegion";

type ConnectConnectorsProps = {
  gateway: GatewayEntry;
  listConnectors: ListConnectors;
  // actions enables pause, resume and restart; without it the tab is read-only.
  actions?: ConnectorActions;
};

const confirmations: Record<ConnectorAction["kind"], (action: ConnectorAction) => string> = {
  pause: (action) => `Pause connector "${action.connector}"?`,
  resume: (action) => `Resume connector "${action.connector}"?`,
  restart: (action) => `Restart connector "${action.connector}" and its tasks?`,
  "restart-task": (action) => `Restart task ${"task" in action ? action.task : ""} of connector "${action.connector}"?`,
};

const requested: Record<ConnectorAction["kind"], (action: ConnectorAction) => string> = {
  pause: (action) => `Pause requested for ${action.connector}.`,
  resume: (action) => `Resume requested for ${action.connector}.`,
  restart: (action) => `Restart requested for ${action.connector}.`,
  "restart-task": (action) => `Restart requested for task ${"task" in action ? action.task : ""} of ${action.connector}.`,
};

export function ConnectConnectors({ gateway, listConnectors, actions }: ConnectConnectorsProps) {
  const { data: connectors, isError, error, refetch, isFetching } = useConnectors(gateway, listConnectors);
  const code = error instanceof HttpError ? error.problem?.code : undefined;
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const [failure, setFailure] = useState("");
  const timers = useRef<number[]>([]);

  useEffect(() => () => { for (const timer of timers.current) window.clearTimeout(timer); }, []);

  async function run(action: ConnectorAction) {
    if (!actions || pending || !actions.confirm(confirmations[action.kind](action))) return;
    setPending(true);
    setNotice("");
    setFailure("");
    try {
      await actions.run(gateway.url, action);
      setNotice(requested[action.kind](action));
      void refetch();
      // Connect applies actions asynchronously, so the list is read again once the new state has settled.
      timers.current.push(window.setTimeout(() => void refetch(), 3000));
    } catch (problem) {
      setFailure(describeConnectorActionError(problem));
    } finally {
      setPending(false);
    }
  }

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
          {notice ? <p role="status">{notice}</p> : null}
          {failure ? <p role="alert">{failure}</p> : null}
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
                  {actions ? <th scope="col">Actions</th> : null}
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
                              {connector.tasks.map((task) => (
                                <li key={task.id}>
                                  Task {task.id}: {task.state}
                                  {actions ? (
                                    <button type="button" className={styles.taskAction} disabled={pending}
                                      aria-label={`Restart task ${task.id} of ${connector.name}`}
                                      onClick={() => void run({ kind: "restart-task", connector: connector.name, task: task.id })}>
                                      Restart task {task.id}
                                    </button>
                                  ) : null}
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                        {actions ? (
                          <td>
                            <div className={styles.actions}>
                              {connector.state === "PAUSED" ? (
                                <button type="button" disabled={pending} aria-label={`Resume ${connector.name}`}
                                  onClick={() => void run({ kind: "resume", connector: connector.name })}>Resume</button>
                              ) : (
                                <button type="button" disabled={pending} aria-label={`Pause ${connector.name}`}
                                  onClick={() => void run({ kind: "pause", connector: connector.name })}>Pause</button>
                              )}
                              <button type="button" disabled={pending} aria-label={`Restart ${connector.name}`}
                                onClick={() => void run({ kind: "restart", connector: connector.name })}>Restart</button>
                            </div>
                          </td>
                        ) : null}
                      </tr>
                      {errors.length > 0 ? (
                        <tr className={styles.errorRow}>
                          <td colSpan={actions ? 6 : 5}>
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
