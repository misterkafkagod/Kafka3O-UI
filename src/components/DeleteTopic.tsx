import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import type { ConfirmTopicDeletion, DeleteTopic as DeleteAction } from "../gateway/deleteTopic";
import { describeDeleteTopicError } from "../gateway/describeDeleteTopicError";
import type { GatewayEntry } from "../gateway/types";
import { isGatewayTopicListQuery } from "../topics/isGatewayTopicListQuery";
import { isGatewayTopicQuery } from "../topics/isGatewayTopicQuery";

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
  const submitting = useRef(false);
  const hasAccepted = useRef(false);

  async function submit() {
    if (submitting.current || hasAccepted.current) return;
    try {
      if (!confirmTopicDeletion(topicName)) return;
    } catch {
      setError("The confirmation dialog is unavailable; no deletion request was sent.");
      return;
    }
    submitting.current = true;
    setPending(true);
    setError("");
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
      {error ? <p role="alert">{error}</p> : null}
      {accepted ? <p>Deletion was accepted. Removing the topic and its messages may take time.</p> : null}
    </section>
  );
}
