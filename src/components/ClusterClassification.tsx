import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { ClusterEnvironment, ConsoleAdminClient, RegisteredCluster } from "../console/ConsoleAdmin";
import { ConsoleAdminError } from "../console/ConsoleAdminError";
import { describeAdminError } from "../console/describeAdminError";
import { describeEnvironment } from "../console/describeEnvironment";
import shared from "./AccessManagement.module.css";
import styles from "./ClusterClassification.module.css";

type ClusterClassificationProps = {
  admin: ConsoleAdminClient;
  confirm: (message: string) => boolean;
  onUnauthorized: () => void;
};

export function ClusterClassification({ admin, confirm, onUnauthorized }: ClusterClassificationProps) {
  const [clusters, setClusters] = useState<RegisteredCluster[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [clusterId, setClusterId] = useState("");
  const [environment, setEnvironment] = useState<Exclude<ClusterEnvironment, "">>("PRODUCTION");
  const [reason, setReason] = useState("");

  const fail = useCallback((failure: unknown) => {
    if (failure instanceof ConsoleAdminError && failure.code === "unauthorized") {
      onUnauthorized();
      return;
    }
    setError(describeAdminError(failure));
  }, [onUnauthorized]);

  const load = useCallback(async () => {
    try {
      setClusters((await admin.listClusters()).clusters);
    } catch (failure) {
      fail(failure);
    }
  }, [admin, fail]);

  useEffect(() => {
    void load();
  }, [load]);

  const cluster = clusters?.find((entry) => entry.id === clusterId);

  async function classify(event: FormEvent) {
    event.preventDefault();
    if (pending || !cluster) return;
    setError("");
    setNotice("");
    const trimmed = reason.trim();
    if (trimmed === "") {
      setError(describeAdminError(new ConsoleAdminError("change_reason_required")));
      return;
    }
    if (environment === cluster.environment) {
      setError("Choose a classification different from the current one.");
      return;
    }
    if (!confirm(`Classify ${cluster.name} (${cluster.id}) from ${describeEnvironment(cluster.environment)} to ${describeEnvironment(environment)}? Reason: ${trimmed}`)) {
      setNotice("Canceled. No change was sent.");
      return;
    }
    setPending(true);
    try {
      const result = await admin.classifyCluster(cluster.id, cluster.environment, environment, trimmed);
      setNotice(`Saved. Policy revision ${result.policyRevision} (operation ${result.operationId}).`);
      setReason("");
      await load();
    } catch (failure) {
      fail(failure);
      if (failure instanceof ConsoleAdminError && failure.code === "policy_conflict") await load();
    } finally {
      setPending(false);
    }
  }

  return (
    <section className={shared.section} aria-labelledby="cluster-classification-heading">
      <h2 id="cluster-classification-heading">Cluster classification</h2>
      <p className={shared.explanation}>
        The Console store is the only source of a cluster&apos;s environment. Kafka writes on Production clusters require ADMIN with a
        change reason; unclassified clusters block every Kafka write.
      </p>
      {error ? <p role="alert" className={shared.error}>{error}</p> : null}
      {notice ? <p role="status" className={shared.notice}>{notice}</p> : null}
      {clusters === null ? (error ? null : <p role="status">Loading clusters…</p>) : clusters.length === 0 ? (
        <p className={shared.explanation}>No clusters are registered. Add them to the Console cluster file.</p>
      ) : (
        <>
          <div className={shared.tableRegion} role="region" aria-label="Registered clusters" tabIndex={0}>
            <table className={shared.table}>
              <thead><tr><th scope="col">Cluster</th><th scope="col">Gateway</th><th scope="col">Environment</th><th scope="col">Status</th></tr></thead>
              <tbody>
                {clusters.map((entry) => (
                  <tr key={entry.id}>
                    <th scope="row">{entry.name} ({entry.id})</th>
                    <td>{entry.gatewayUrl}</td>
                    <td>
                      <span className={`${styles.badge} ${entry.environment === "PRODUCTION" ? styles.production : entry.environment === "" ? styles.unclassified : ""}`}>
                        {describeEnvironment(entry.environment)}
                      </span>
                    </td>
                    <td>{entry.active ? "Active" : "Inactive"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <form className={shared.form} onSubmit={(event) => void classify(event)} aria-labelledby="classify-form-heading">
            <h3 id="classify-form-heading">Classify a cluster</h3>
            <label>Cluster
              <select value={clusterId} onChange={(event) => setClusterId(event.target.value)} required>
                <option value="">Choose a cluster</option>
                {clusters.filter((entry) => entry.active).map((entry) => <option key={entry.id} value={entry.id}>{entry.name} ({entry.id})</option>)}
              </select>
            </label>
            <label>Environment
              <select value={environment} onChange={(event) => setEnvironment(event.target.value as Exclude<ClusterEnvironment, "">)}>
                <option value="PRODUCTION">Production</option>
                <option value="NON_PRODUCTION">Non-production</option>
              </select>
            </label>
            <label>Reason
              <textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={512} aria-required="true" />
            </label>
            {cluster ? <p className={shared.current}>Current classification: {describeEnvironment(cluster.environment)}</p> : null}
            <button type="submit" disabled={pending || !cluster}>Review classification</button>
          </form>
        </>
      )}
    </section>
  );
}
