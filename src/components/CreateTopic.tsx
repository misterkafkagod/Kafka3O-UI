import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState, type FormEvent } from "react";
import type { CreateTopic as CreateAction } from "../gateway/createTopic";
import { classifyGatewayError } from "../gateway/classifyGatewayError";
import { describeCreateTopicError } from "../gateway/describeCreateTopicError";
import type { GatewayEntry } from "../gateway/types";
import { createTopicFromForm } from "../topics/createTopicFromForm";
import { isGatewayTopicListQuery } from "../topics/isGatewayTopicListQuery";
import { GatewayCredentialAction } from "./GatewayCredentialAction";

type CreateTopicProps = {
  gateway: GatewayEntry;
  createTopic: CreateAction;
};

export function CreateTopic({ gateway, createTopic }: CreateTopicProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [partitions, setPartitions] = useState("1");
  const [replicationFactor, setReplicationFactor] = useState("1");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [authenticationRequired, setAuthenticationRequired] = useState(false);
  const [created, setCreated] = useState("");
  const submitting = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const parsed = createTopicFromForm(name, partitions, replicationFactor);
    if (parsed.error !== undefined) {
      setCreated("");
      setError(parsed.error);
      setAuthenticationRequired(false);
      return;
    }
    submitting.current = true;
    setPending(true);
    setCreated("");
    setError("");
    setAuthenticationRequired(false);
    try {
      await createTopic(gateway.url, parsed.input);
      setCreated(parsed.input.name);
      void queryClient.invalidateQueries({ queryKey: ["gateway"], predicate: isGatewayTopicListQuery });
    } catch (failure) {
      setError(describeCreateTopicError(failure));
      setAuthenticationRequired(classifyGatewayError(failure) === "authentication-required");
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} aria-label="Create topic" noValidate>
      <fieldset disabled={pending}>
        <label>Topic name<input value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label>Partitions<input type="number" min="1" max="2147483647" step="1" value={partitions} onChange={(event) => setPartitions(event.target.value)} /></label>
        <label>Replication factor<input type="number" min="1" max="32767" step="1" value={replicationFactor} onChange={(event) => setReplicationFactor(event.target.value)} /></label>
        <button type="submit">{pending ? "Creating…" : "Create topic"}</button>
      </fieldset>
      {error ? (
        <div role="alert">
          <p>{error}</p>
          {authenticationRequired ? <GatewayCredentialAction gateway={gateway} /> : null}
        </div>
      ) : null}
      {created ? <p>Creation of "{created}" was accepted; it may take a moment to appear.</p> : null}
    </form>
  );
}
