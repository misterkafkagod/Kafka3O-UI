import type { ClusterMetrics } from "../gateway/getMetrics";
import { formatBytes } from "../groups/formatBytes";
import { ScrollableTableRegion } from "./ScrollableTableRegion";

type LargestTopicsProps = {
  largestTopics: ClusterMetrics["largestTopics"];
};

export function LargestTopics({ largestTopics }: LargestTopicsProps) {
  return (
    <section aria-labelledby="largest-topics">
      <h3 id="largest-topics">Largest topics</h3>
      <p>Size on disk, all replicas together.</p>
      {largestTopics.error ? <p role="alert">Unavailable: {largestTopics.error}</p> : null}
      {largestTopics.topics.length > 0 ? (
        <ScrollableTableRegion label="Largest topics table scroll area">
          <table aria-label="Largest topics">
            <thead>
              <tr>
                <th scope="col">Topic</th>
                <th scope="col">Size</th>
              </tr>
            </thead>
            <tbody>
              {largestTopics.topics.map((topic) => (
                <tr key={topic.topic}>
                  <td>{topic.topic}</td>
                  <td>{formatBytes(topic.bytes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollableTableRegion>
      ) : largestTopics.error ? null : (
        <p>No topic data on disk.</p>
      )}
    </section>
  );
}
