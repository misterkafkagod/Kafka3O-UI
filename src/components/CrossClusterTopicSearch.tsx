import { useState } from "react";
import type { ListTopics } from "../gateway/listTopics";
import type { GatewayEntry } from "../gateway/types";
import { GatewayTopicSearchResults } from "./GatewayTopicSearchResults";

type CrossClusterTopicSearchProps = {
  gateways: GatewayEntry[];
  listTopics: ListTopics;
};

export function CrossClusterTopicSearch({ gateways, listTopics }: CrossClusterTopicSearchProps) {
  const [text, setText] = useState("");

  return (
    <section aria-label="Search topics across clusters">
      <h2>Search topics across clusters</h2>
      <label>
        Topic name
        <input type="search" value={text} onChange={(event) => setText(event.target.value)} />
      </label>
      {text.length === 0
        ? null
        : gateways.map((gateway) => (
            <GatewayTopicSearchResults key={gateway.id} gateway={gateway} listTopics={listTopics} text={text} />
          ))}
    </section>
  );
}
