import { useState } from "react";
import type { ListTopics } from "../gateway/listTopics";
import type { GatewayEntry } from "../gateway/types";
import styles from "./CrossClusterTopicSearch.module.css";
import { GatewayTopicSearchResults } from "./GatewayTopicSearchResults";

type CrossClusterTopicSearchProps = {
  gateways: GatewayEntry[];
  listTopics: ListTopics;
};

export function CrossClusterTopicSearch({ gateways, listTopics }: CrossClusterTopicSearchProps) {
  const [text, setText] = useState("");

  return (
    <section aria-label="Search topics across clusters" className={styles.search}>
      <h2>Search topics across clusters</h2>
      <p className={styles.description}>Find topics by name across the configured gateways.</p>
      <label className={styles.field}>
        Topic name
        <input type="search" value={text} onChange={(event) => setText(event.target.value)} />
      </label>
      {text.length === 0 ? (
        <p className={styles.hint}>Enter a topic name to see results for each gateway.</p>
      ) : (
        <div className={styles.results}>
          {gateways.map((gateway) => (
            <GatewayTopicSearchResults key={gateway.id} gateway={gateway} listTopics={listTopics} text={text} />
          ))}
        </div>
      )}
    </section>
  );
}
