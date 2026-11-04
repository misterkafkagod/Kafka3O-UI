import { useState } from "react";
import type { TopicMessage } from "../gateway/types";
import { formatMessageValue, type MessageValueFormat } from "../messages/formatMessageValue";

type MessageTableProps = {
  messages: TopicMessage[];
};

export function MessageTable({ messages }: MessageTableProps) {
  const [valueFormat, setValueFormat] = useState<MessageValueFormat>("text");

  return (
    <>
      <label>
        Value format
        <select
          value={valueFormat}
          onChange={(event) => {
            const value = event.target.value;
            if (value === "text" || value === "json" || value === "base64") {
              setValueFormat(value);
            }
          }}
        >
          <option value="text">Text</option>
          <option value="json">JSON</option>
          <option value="base64">Base64</option>
        </select>
      </label>
      <table aria-label="Topic messages">
        <thead>
          <tr>
            <th scope="col">Partition</th>
            <th scope="col">Offset</th>
            <th scope="col">Timestamp</th>
            <th scope="col">Key (base64)</th>
            <th scope="col">Value</th>
            <th scope="col">Headers</th>
          </tr>
        </thead>
        <tbody>
          {messages.map((message) => {
            const formattedValue = message.value === null ? null : formatMessageValue(message.value, valueFormat);
            return (
              <tr key={`${message.partition}-${message.offset}`}>
                <td>{message.partition}</td>
                <td>{message.offset}</td>
                <td>
                  <time dateTime={message.timestamp}>{new Date(message.timestamp).toLocaleString()}</time>
                </td>
                <td>{message.key === null ? "(null)" : message.key || "(empty)"}</td>
                <td>
                  {formattedValue?.invalidJson ? <p role="status">Invalid JSON</p> : null}
                  <pre>{formattedValue === null ? "(null)" : formattedValue.value || "(empty)"}</pre>
                </td>
                <td>
                  {message.headers.length === 0 ? (
                    "(none)"
                  ) : (
                    <ul>
                      {message.headers.map((header, index) => (
                        <li key={`${header.key}-${index}`}>
                          {header.key}: {header.value === null ? "(null)" : header.value || "(empty)"}
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
