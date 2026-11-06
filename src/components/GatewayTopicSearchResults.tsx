import { Link } from "react-router";
import type { ListTopics } from "../gateway/listTopics";
import type { GatewayEntry } from "../gateway/types";
import { useTopics } from "../hooks/useTopics";
import { compareTopicsByName } from "../topics/compareTopicsByName";
import { filterTopics } from "../topics/filterTopics";
import { ErrorWithRetry } from "./ErrorWithRetry";

type GatewayTopicSearchResultsProps = {
  gateway: GatewayEntry;
  listTopics: ListTopics;
  text: string;
};

export function GatewayTopicSearchResults({ gateway, listTopics, text }: GatewayTopicSearchResultsProps) {
  const { data: topics, isError, error, refetch } = useTopics(gateway, listTopics);
  const matches = topics === undefined ? [] : filterTopics(topics, { showInternal: true, text }).sort(compareTopicsByName);

  return (
    <section aria-label={`${gateway.name} topic results`}>
      <h3>{gateway.name}</h3>
      {isError ? (
        <ErrorWithRetry error={error} gateway={gateway} onRetry={() => void refetch()} />
      ) : topics === undefined ? (
        <p role="status">Loading topics…</p>
      ) : matches.length === 0 ? (
        <p>No topics match "{text}".</p>
      ) : (
        <ul>
          {matches.map((topic) => (
            <li key={topic.name}>
              <Link to={`/clusters/${encodeURIComponent(gateway.id)}/topics/${encodeURIComponent(topic.name)}`}>
                {topic.name}
              </Link>
              {topic.internal ? " (internal)" : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
