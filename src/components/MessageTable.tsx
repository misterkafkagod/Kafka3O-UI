import type { TopicMessage } from "../gateway/types";

type MessageTableProps = {
  messages: TopicMessage[];
};

function displayBase64(value: string) {
  return value === "" ? "(empty)" : value;
}

export function MessageTable({ messages }: MessageTableProps) {
  return (
    <table aria-label="Topic messages">
      <thead>
        <tr>
          <th scope="col">Partition</th>
          <th scope="col">Offset</th>
          <th scope="col">Timestamp</th>
          <th scope="col">Key (base64)</th>
          <th scope="col">Value (base64)</th>
          <th scope="col">Headers</th>
        </tr>
      </thead>
      <tbody>
        {messages.map((message) => (
          <tr key={`${message.partition}-${message.offset}`}>
            <td>{message.partition}</td>
            <td>{message.offset}</td>
            <td>
              <time dateTime={message.timestamp}>{new Date(message.timestamp).toLocaleString()}</time>
            </td>
            <td>{displayBase64(message.key)}</td>
            <td>{displayBase64(message.value)}</td>
            <td>
              {message.headers.length === 0 ? (
                "(none)"
              ) : (
                <ul>
                  {message.headers.map((header, index) => (
                    <li key={`${header.key}-${index}`}>
                      {header.key}: {displayBase64(header.value)}
                    </li>
                  ))}
                </ul>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
