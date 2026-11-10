import type { ClusterMetrics } from "../gateway/getMetrics";
import { computeThroughput } from "../groups/computeThroughput";
import { ScrollableTableRegion } from "./ScrollableTableRegion";

type TopicThroughputProps = {
  previous?: ClusterMetrics;
  current: ClusterMetrics;
};

const rate = (perSecond: number) => `${perSecond.toFixed(perSecond < 10 ? 1 : 0)} messages/s`;

export function TopicThroughput({ previous, current }: TopicThroughputProps) {
  const throughput = previous ? computeThroughput(previous, current) : undefined;
  const active = throughput ? throughput.topics.filter((topic) => topic.perSecond !== null && topic.perSecond > 0)
    .sort((a, b) => b.perSecond! - a.perSecond! || (a.topic < b.topic ? -1 : 1)) : [];
  const unknown = throughput ? throughput.topics.filter((topic) => topic.perSecond === null).map((topic) => topic.topic) : [];
  return (
    <section aria-labelledby="topic-throughput">
      <h3 id="topic-throughput">Throughput</h3>
      {current.endOffsets.error ? (
        <p role="alert">Unavailable: {current.endOffsets.error}</p>
      ) : throughput === undefined ? (
        <p role="status">Measuring… a rate needs a second sample.</p>
      ) : (
        <>
          <p>
            Cluster: {throughput.cluster === null ? "Unknown" : rate(throughput.cluster)} over the last {Math.round(throughput.seconds)} seconds
          </p>
          {active.length > 0 ? (
            <ScrollableTableRegion label="Throughput by topic table scroll area">
              <table aria-label="Throughput by topic">
                <thead>
                  <tr>
                    <th scope="col">Topic</th>
                    <th scope="col">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {active.map((topic) => (
                    <tr key={topic.topic}>
                      <td>{topic.topic}</td>
                      <td>{rate(topic.perSecond!)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollableTableRegion>
          ) : (
            <p>No topic received messages since the last sample.</p>
          )}
          {unknown.length > 0 ? <p>No rate for: {unknown.join(", ")}</p> : null}
        </>
      )}
    </section>
  );
}
