import { HttpError } from "../gateway/HttpError";
import type { GatewayEntry, TopicMessage } from "../gateway/types";
import { findLinkedTopicMessage } from "../messages/findLinkedTopicMessage";
import type { MessageLinkContext } from "../messages/messageLink";
import type { TopicMessageLinkPosition } from "../messages/topicMessageLinkPosition";
import { ErrorWithRetry } from "./ErrorWithRetry";
import { MessageWorkspace } from "./MessageWorkspace";

type LinkedTopicMessageProps = {
  position: TopicMessageLinkPosition;
  gateway: GatewayEntry;
  messages: TopicMessage[] | undefined;
  isError: boolean;
  error: unknown;
  isFetching: boolean;
  onRetry: () => void;
  messageLinks: MessageLinkContext;
};

export function LinkedTopicMessage({ position, gateway, messages, isError, error, isFetching, onRetry, messageLinks }: LinkedTopicMessageProps) {
  if (isError) {
    if (error instanceof HttpError && (error.problem?.code === "invalid_position" || error.problem?.code === "not_found")) {
      return <p role="alert">No message is available at this partition and offset.</p>;
    }
    return <ErrorWithRetry error={error} gateway={gateway} onRetry={onRetry} />;
  }
  if (isFetching || messages === undefined) {
    return <p role="status">Loading linked message…</p>;
  }
  const result = findLinkedTopicMessage(messages, position);
  if (result.kind === "unverifiable") {
    return <p role="alert">The gateway did not provide an exact offset, so this message cannot be verified.</p>;
  }
  if (result.kind === "not-found") {
    return <p role="alert">No message is available at this partition and offset.</p>;
  }
  return <MessageWorkspace messages={[result.message]} messageLinks={messageLinks} verifiedLink />;
}
