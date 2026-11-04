import { useState } from "react";
import type { TopicMessage } from "../gateway/types";
import { exactMessageOffset } from "../messages/exactMessageOffset";
import { messageLink, type MessageLinkContext } from "../messages/messageLink";

type CopyMessageLinkProps = {
  context: MessageLinkContext;
  message: TopicMessage;
};

export function CopyMessageLink({ context, message }: CopyMessageLinkProps) {
  const [status, setStatus] = useState<"copied" | "failed">();
  const url = messageLink(context, message);
  if (url === undefined) {
    return <span role="alert">Cannot create a link: the exact message position is unavailable.</span>;
  }
  return (
    <>
      <a href={url}>Message link</a>{" "}
      <button
        type="button"
        aria-label={`Copy link for partition ${message.partition} offset ${exactMessageOffset(message)}`}
        onClick={async () => {
          try {
            await context.copyText(url);
            setStatus("copied");
          } catch {
            setStatus("failed");
          }
        }}
      >
        Copy link
      </button>
      {status === "copied" ? <span role="status">Message link copied.</span> : null}
      {status === "failed" ? <span role="alert">Copy failed; use the message link instead.</span> : null}
    </>
  );
}
