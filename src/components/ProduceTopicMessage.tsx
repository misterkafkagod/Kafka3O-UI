import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { describeProduceError } from "../gateway/describeProduceError";
import type { ProduceMessageResult, ProduceTopicMessage as ProduceAction } from "../gateway/produceTopicMessage";
import type { GatewayEntry } from "../gateway/types";
import { produceMessageFromForm, type ProduceHeaderField } from "../messages/produceMessageFromForm";

type ProduceTopicMessageProps = {
  gateway: GatewayEntry;
  topicName: string;
  produceTopicMessage: ProduceAction;
};

export function ProduceTopicMessage({ gateway, topicName, produceTopicMessage }: ProduceTopicMessageProps) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState("");
  const [includeKey, setIncludeKey] = useState(false);
  const [key, setKey] = useState("");
  const [headers, setHeaders] = useState<ProduceHeaderField[]>([]);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ProduceMessageResult>();
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const nextHeader = useRef(0);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setPending(true);
    setError("");
    setResult(undefined);
    try {
      const produced = await produceTopicMessage(gateway.url, topicName, produceMessageFromForm(value, includeKey, key, headers));
      setResult(produced);
      void queryClient.invalidateQueries({ queryKey: ["gateway", gateway.id, "topic", topicName, "messages"] });
      void queryClient.invalidateQueries({ queryKey: ["gateway", gateway.id, "topics"] });
    } catch (failure) {
      setError(describeProduceError(failure));
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} aria-label="Produce message">
      <fieldset disabled={pending}>
        <label>
          Value (UTF-8)
          <textarea value={value} onChange={(event) => setValue(event.target.value)} />
        </label>
        <label>
          <input type="checkbox" checked={includeKey} onChange={(event) => setIncludeKey(event.target.checked)} />
          Include key
        </label>
        {includeKey ? <label>Key (UTF-8)<input value={key} onChange={(event) => setKey(event.target.value)} /></label> : null}
        <h4>Headers</h4>
        {headers.map((header, index) => (
          <div key={header.id}>
            <label>
              Header {index + 1} key
              <input value={header.key} onChange={(event) => {
                const text = event.target.value;
                setHeaders((current) => current.map((item) => item.id === header.id ? { ...item, key: text } : item));
              }} />
            </label>
            <label>
              Header {index + 1} value
              <input value={header.value} onChange={(event) => {
                const text = event.target.value;
                setHeaders((current) => current.map((item) => item.id === header.id ? { ...item, value: text } : item));
              }} />
            </label>
            <button type="button" aria-label={`Remove header ${index + 1}`} onClick={() =>
              setHeaders((current) => current.filter((item) => item.id !== header.id))}>Remove</button>
          </div>
        ))}
        <button type="button" onClick={() => {
          const id = nextHeader.current++;
          setHeaders((current) => [...current, { id, key: "", value: "" }]);
        }}>Add header</button>
        <button type="submit">{pending ? "Sending…" : "Send message"}</button>
      </fieldset>
      {error ? <p role="alert">{error}</p> : null}
      {result ? (
        <p>
          Sent to partition {result.partition}, offset {result.offset}.{" "}
          <Link to={`/clusters/${encodeURIComponent(gateway.id)}/topics/${encodeURIComponent(topicName)}/messages?${new URLSearchParams({ partition: String(result.partition), offset: result.offset })}`}>Read this message</Link>
        </p>
      ) : null}
    </form>
  );
}
