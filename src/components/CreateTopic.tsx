import { useQueryClient } from "@tanstack/react-query";
import { useId, useRef, useState, type FormEvent } from "react";
import type { CreateTopic as CreateAction } from "../gateway/createTopic";
import { classifyGatewayError } from "../gateway/classifyGatewayError";
import { describeCreateTopicError } from "../gateway/describeCreateTopicError";
import type { GatewayEntry, GatewayErrorKind } from "../gateway/types";
import { createTopicFromForm } from "../topics/createTopicFromForm";
import { isGatewayTopicListQuery } from "../topics/isGatewayTopicListQuery";
import { GatewayErrorRecovery } from "./GatewayErrorRecovery";
import styles from "./CreateTopic.module.css";

type CreateTopicProps = {
  gateway: GatewayEntry;
  createTopic: CreateAction;
};

export function CreateTopic({ gateway, createTopic }: CreateTopicProps) {
  const queryClient = useQueryClient();
  const nameHelpId = useId();
  const [name, setName] = useState("");
  const [partitions, setPartitions] = useState("1");
  const [replicationFactor, setReplicationFactor] = useState("1");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [errorKind, setErrorKind] = useState<GatewayErrorKind>();
  const [created, setCreated] = useState("");
  const submitting = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const parsed = createTopicFromForm(name, partitions, replicationFactor);
    if (parsed.error !== undefined) {
      setCreated("");
      setError(parsed.error);
      setErrorKind(undefined);
      return;
    }
    submitting.current = true;
    setPending(true);
    setCreated("");
    setError("");
    setErrorKind(undefined);
    try {
      await createTopic(gateway.url, parsed.input);
      setCreated(parsed.input.name);
      void queryClient.invalidateQueries({ queryKey: ["gateway"], predicate: isGatewayTopicListQuery });
    } catch (failure) {
      setError(describeCreateTopicError(failure));
      setErrorKind(classifyGatewayError(failure));
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} aria-label="Create topic" className={styles.form} noValidate>
      <p className={styles.context}>Destination gateway: <strong>{gateway.name}</strong></p>
      <fieldset disabled={pending}>
        <legend>Topic settings</legend>
        <div className={styles.fields}>
          <label>Topic name<input value={name} aria-describedby={nameHelpId} onChange={(event) => setName(event.target.value)} /></label>
          <p id={nameHelpId} className={styles.help}>Use 1-249 ASCII letters, digits, dots, underscores or hyphens; . and .. are not allowed.</p>
          <label>Partitions<input type="number" min="1" max="2147483647" step="1" value={partitions} onChange={(event) => setPartitions(event.target.value)} /></label>
          <label>Replication factor<input type="number" min="1" max="32767" step="1" value={replicationFactor} onChange={(event) => setReplicationFactor(event.target.value)} /></label>
        </div>
        <button type="submit">{pending ? "Creating…" : "Create topic"}</button>
      </fieldset>
      {error ? (
        <div role="alert">
          <p>{error}</p>
          <GatewayErrorRecovery gateway={gateway} kind={errorKind} />
        </div>
      ) : null}
      {created ? <p role="status">Creation of "{created}" was accepted; it may take a moment to appear.</p> : null}
    </form>
  );
}
