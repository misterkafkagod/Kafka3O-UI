import { useId, useState } from "react";
import type { TopicMessage } from "../gateway/types";
import type { MessageLinkContext } from "../messages/messageLink";
import { MessageInspector } from "./MessageInspector";
import { MessageResultList } from "./MessageResultList";
import styles from "./MessageWorkspace.module.css";

type MessageWorkspaceProps = {
  messages: TopicMessage[];
  messageLinks?: MessageLinkContext;
  verifiedLink?: boolean;
};

export function MessageWorkspace({ messages, messageLinks, verifiedLink }: MessageWorkspaceProps) {
  const inspectorId = useId();
  const [selection, setSelection] = useState<{ results: TopicMessage[]; message: TopicMessage | undefined }>({
    results: messages,
    message: messages[0],
  });
  const resetSelection = selection.results !== messages
    || (selection.message === undefined ? messages.length !== 0 : !messages.includes(selection.message));
  if (resetSelection) {
    setSelection({ results: messages, message: messages[0] });
  }
  const selected = resetSelection ? messages[0] : selection.message;
  if (selected === undefined) {
    return <p>No messages found.</p>;
  }

  return (
    <div className={styles.workspace}>
      <MessageResultList
        messages={messages}
        selectedIndex={messages.indexOf(selected)}
        inspectorId={inspectorId}
        onSelect={(message) => setSelection({ results: messages, message })}
      />
      <MessageInspector id={inspectorId} message={selected} messageLinks={messageLinks} verifiedLink={verifiedLink} />
    </div>
  );
}
