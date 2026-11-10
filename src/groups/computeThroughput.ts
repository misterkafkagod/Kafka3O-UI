import type { ClusterMetrics } from "../gateway/getMetrics";

export type Throughput = {
  // cluster is the sum of the known topic rates, or null when no topic has one.
  cluster: number | null;
  seconds: number;
  topics: { topic: string; perSecond: number | null }[];
};

// computeThroughput works out messages per second from two samples' end-offset sums; a decrease (the topic was
// recreated or truncated), a missing topic or an error gives no rate rather than a negative or invented one.
export function computeThroughput(previous: ClusterMetrics, current: ClusterMetrics): Throughput {
  const seconds = (Date.parse(current.readAt) - Date.parse(previous.readAt)) / 1000;
  const before = new Map(previous.endOffsets.topics.filter((topic) => topic.endOffset !== undefined).map((topic) => [topic.topic, BigInt(topic.endOffset!)]));
  let cluster: number | null = null;
  const topics = current.endOffsets.topics.map(({ topic, endOffset }) => {
    const start = before.get(topic);
    if (endOffset === undefined || start === undefined || !(seconds > 0)) {
      return { topic, perSecond: null };
    }
    const delta = BigInt(endOffset) - start;
    if (delta < 0n) {
      return { topic, perSecond: null };
    }
    const perSecond = Number(delta) / seconds;
    cluster = (cluster ?? 0) + perSecond;
    return { topic, perSecond };
  });
  return { cluster, seconds, topics };
}
