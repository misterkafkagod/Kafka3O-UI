import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import type { ConfirmTopicDeletion, DeleteTopic as DeleteAction } from "../gateway/deleteTopic";
import { classifyGatewayError } from "../gateway/classifyGatewayError";
import { describeDeleteTopicError } from "../gateway/describeDeleteTopicError";
import type { GatewayEntry, GatewayErrorKind } from "../gateway/types";
import { isGatewayTopicListQuery } from "../topics/isGatewayTopicListQuery";
import { isGatewayTopicQuery } from "../topics/isGatewayTopicQuery";
import { GatewayErrorRecovery } from "./GatewayErrorRecovery";

type DeleteTopicProps = {
  gateway: GatewayEntry;
  topicName: string;
  deleteTopic: DeleteAction;
  confirmTopicDeletion: ConfirmTopicDeletion;
};

export function DeleteTopic({ gateway, topicName, deleteTopic, confirmTopicDeletion }: DeleteTopicProps) {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [errorKind, setErrorKind] = useState<GatewayErrorKind>();
  const submitting = useRef(false);
  const hasAccepted = useRef(false);

  async function submit() {
    if (submitting.current || hasAccepted.current) return;
    try {
      if (!confirmTopicDeletion(topicName)) return;
    } catch {
      setError("The confirmation dialog is unavailable; no deletion request was sent.");
      setErrorKind(undefined);
      return;
    }
    submitting.current = true;
    setPending(true);
    setError("");
    setErrorKind(undefined);
    try {
      await deleteTopic(gateway.url, topicName);
      hasAccepted.current = true;
      setAccepted(true);
      void queryClient.invalidateQueries({ queryKey: ["gateway"], predicate: isGatewayTopicListQuery });
      void queryClient.invalidateQueries({
        queryKey: ["gateway"],
        predicate: (query) => isGatewayTopicQuery(query, topicName),
        refetchType: "none",
      });
    } catch (failure) {
      setError(describeDeleteTopicError(failure));
      setErrorKind(classifyGatewayError(failure));
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  return (
    <section aria-label="Delete topic">
      <button type="button" disabled={pending || accepted} onClick={() => void submit()}>
        {pending ? "Requesting deletion…" : accepted ? "Deletion requested" : "Delete topic"}
      </button>
      {error ? (
        <div role="alert">
          <p>{error}</p>
          <GatewayErrorRecovery gateway={gateway} kind={errorKind} />
        </div>
      ) : null}
      {accepted ? <p>Deletion was accepted. Removing the topic and its messages may take time.</p> : null}
    </section>
  );
}
