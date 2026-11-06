import { useQuery, useQueryClient, type QueryObserverResult } from "@tanstack/react-query";
import { useRef, useState, type FormEvent } from "react";
import type { KafkaAdministration } from "../gateway/administration";
import { classifyGatewayError } from "../gateway/classifyGatewayError";
import { describeAdministrationError } from "../gateway/describeAdministrationError";
import type { Broker, ClusterInfo, GatewayEntry, GatewayErrorKind, TopicDetail } from "../gateway/types";
import { parseReplicaIds } from "../topics/parseReplicaIds";
import { ErrorWithRetry } from "./ErrorWithRetry";
import { GatewayErrorRecovery } from "./GatewayErrorRecovery";
import { ScrollableTableRegion } from "./ScrollableTableRegion";
import styles from "./KafkaAdministration.module.css";

type Props = {
  gateway: GatewayEntry;
  detail: TopicDetail;
  brokers: Broker[];
  administration: KafkaAdministration;
  refreshTopic: () => Promise<QueryObserverResult<TopicDetail, Error>>;
  refreshCluster: () => Promise<QueryObserverResult<ClusterInfo, Error>>;
  ready: boolean;
};

export function PartitionManagement({ gateway, detail, brokers, administration, refreshTopic, refreshCluster, ready }: Props) {
  const queryClient = useQueryClient();
  const [count, setCount] = useState(String(detail.partitions.length + 1));
  const [partitionID, setPartitionID] = useState(String(detail.partitions[0]?.id ?? ""));
  const [replicasText, setReplicasText] = useState(detail.partitions[0]?.replicas.join(", ") ?? "");
  const [pending, setPending] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [message, setMessage] = useState("");
  const [writeError, setWriteError] = useState("");
  const [errorKind, setErrorKind] = useState<GatewayErrorKind>();
  const submitting = useRef(false);
  const status = useQuery({
    queryKey: ["gateway", gateway.id, "reassignments", detail.name],
    queryFn: () => administration.listReassignments(gateway.url, detail.name),
    retry: false,
    refetchInterval: 10_000,
  });
  const selected = detail.partitions.find((partition) => String(partition.id) === partitionID) ?? detail.partitions[0];
  const active = selected !== undefined && status.data?.some((item) => item.partition === selected.id);

  async function refreshState() {
    const [topicResult, statusResult, clusterResult] = await Promise.all([refreshTopic(), status.refetch(), refreshCluster()]);
    if (!topicResult.isError && !statusResult.isError && !clusterResult.isError && topicResult.data) {
      setUncertain(false);
      if (uncertain) {
        setWriteError("");
        setErrorKind(undefined);
        setMessage("Topic, brokers, and reassignment status refreshed. Verify the current state before another change.");
      }
      setCount(String(topicResult.data.partitions.length + 1));
      const current = topicResult.data.partitions.find((partition) => String(partition.id) === partitionID) ?? topicResult.data.partitions[0];
      setPartitionID(current ? String(current.id) : "");
      setReplicasText(current?.replicas.join(", ") ?? "");
    }
  }

  async function change(confirmation: string, action: () => Promise<void>, success: string) {
    if (submitting.current || uncertain || !ready) return;
    try {
      if (!administration.confirmChange(confirmation)) return;
    } catch {
      setWriteError("The confirmation dialog is unavailable; no change was submitted.");
      return;
    }
    submitting.current = true;
    setPending(true);
    setMessage("");
    setWriteError("");
    setErrorKind(undefined);
    try {
      await action();
      setMessage(success);
      void queryClient.invalidateQueries({ queryKey: ["gateway", gateway.id, "topics"] });
      await refreshState();
    } catch (failure) {
      const described = describeAdministrationError(failure);
      setWriteError(described.message);
      setUncertain(described.uncertain);
      setErrorKind(classifyGatewayError(failure));
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  function increase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const desired = Number(count);
    if (!/^\d+$/.test(count) || !Number.isSafeInteger(desired) || desired > 2147483647 || desired <= detail.partitions.length) {
      setWriteError("Enter a whole number greater than the current partition count, up to 2147483647.");
      return;
    }
    void change(
      `Increase "${detail.name}" on ${gateway.name} from ${detail.partitions.length} to ${desired} partitions? This cannot be undone and may change message routing and ordering.`,
      () => administration.increasePartitions(gateway.url, detail.name, desired),
      "Kafka accepted the partition increase. Refresh the topic to verify the final count.",
    );
  }

  function reassign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || status.isPending || status.isError || active) {
      setWriteError("Choose a partition without an active reassignment and refresh its status.");
      return;
    }
    const replicas = parseReplicaIds(replicasText, brokers.map((broker) => broker.id));
    if (replicas === null) {
      setWriteError("Enter distinct, existing broker IDs separated by commas. An empty list cannot cancel a reassignment.");
      return;
    }
    if (replicas.length === selected.replicas.length && replicas.every((id, index) => id === selected.replicas[index])) {
      setWriteError("Choose an assignment different from the current replicas.");
      return;
    }
    void change(
      `Reassign "${detail.name}" partition ${selected.id} on ${gateway.name} from [${selected.replicas.join(", ")}] to [${replicas.join(", ")}]? This moves data and changing replica count affects durability.`,
      () => administration.reassignPartition(gateway.url, detail.name, selected.id, replicas),
      "Kafka accepted the reassignment request. It may still be moving data; check the status and current replicas below.",
    );
  }

  return (
    <section aria-labelledby="partition-management-heading" className={styles.section}>
      <div className={styles.sectionHeading}>
        <h3 id="partition-management-heading">Partitions and replica placement</h3>
        <button type="button" disabled={pending} onClick={() => void refreshState()}>Refresh topic and status</button>
      </div>
      <p className={styles.warning}>Partition increases cannot be reversed and can change keyed message routing and ordering. Replica changes move data and may affect durability.</p>
      {message ? <p role="status">{message}</p> : null}
      {writeError ? (
        <div role="alert">
          <p>{writeError}</p>
          <GatewayErrorRecovery gateway={gateway} kind={errorKind} />
        </div>
      ) : null}
      {uncertain ? <p>Refresh the topic and reassignment status successfully before submitting another change.</p> : null}
      <form aria-label="Increase partitions" className={styles.form} onSubmit={increase} noValidate>
        <fieldset disabled={pending || uncertain || !ready}>
          <legend>Increase partition count</legend>
          <p>Current count: {detail.partitions.length}</p>
          <label>Desired total partitions
            <input type="number" min={detail.partitions.length + 1} max="2147483647" step="1" value={count} onChange={(event) => setCount(event.target.value)} />
          </label>
          <button type="submit">{pending ? "Submitting…" : "Review partition increase"}</button>
        </fieldset>
      </form>
      <h4>Active reassignments</h4>
      <p className={styles.note}>Status refreshes every 10 seconds while this page is active.</p>
      {status.isError ? <ErrorWithRetry error={status.error} gateway={gateway} onRetry={() => void status.refetch()} /> :
        status.isPending ? <p role="status">Loading reassignment status…</p> :
          status.data.length === 0 ? <p>No active reassignments reported.</p> : (
            <ScrollableTableRegion label="Active reassignments table scroll area">
              <table aria-label="Active reassignments">
                <thead><tr><th scope="col">Partition</th><th scope="col">Replicas</th><th scope="col">Adding</th><th scope="col">Removing</th></tr></thead>
                <tbody>{status.data.map((item) => (
                  <tr key={item.partition}><td>{item.partition}</td><td>{item.replicas.join(", ") || "—"}</td><td>{item.addingReplicas.join(", ") || "—"}</td><td>{item.removingReplicas.join(", ") || "—"}</td></tr>
                ))}</tbody>
              </table>
            </ScrollableTableRegion>
          )}
      <form aria-label="Change replica placement" className={styles.form} onSubmit={reassign} noValidate>
        <fieldset disabled={pending || uncertain || !ready || status.isPending || status.isError || detail.partitions.length === 0}>
          <legend>Manual replica placement</legend>
          <p>Available broker IDs: {brokers.map((broker) => broker.id).sort((a, b) => a - b).join(", ") || "none"}.</p>
          {brokers.length === 1 ? <p>This cluster has one broker; replication across brokers requires at least two.</p> : null}
          <label>Partition
            <select value={selected ? String(selected.id) : ""} onChange={(event) => {
              const next = detail.partitions.find((partition) => String(partition.id) === event.target.value);
              setPartitionID(event.target.value);
              setReplicasText(next?.replicas.join(", ") ?? "");
            }}>
              {detail.partitions.map((partition) => <option key={partition.id} value={partition.id}>{partition.id}</option>)}
            </select>
          </label>
          <p>Current replicas: {selected?.replicas.join(", ") || "none reported"}.</p>
          <label>Ordered replica broker IDs
            <input value={replicasText} onChange={(event) => setReplicasText(event.target.value)} aria-describedby="replicas-help" />
          </label>
          <p id="replicas-help" className={styles.note}>Separate IDs with commas. The first broker is the preferred leader; an empty list is not allowed.</p>
          {active ? <p>This partition has an active reassignment; wait for it to finish.</p> : null}
          <button type="submit" disabled={active}>{pending ? "Submitting…" : "Review replica assignment"}</button>
        </fieldset>
      </form>
    </section>
  );
}
