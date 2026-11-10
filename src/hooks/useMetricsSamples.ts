import { useState } from "react";
import type { ClusterMetrics } from "../gateway/getMetrics";

// useMetricsSamples keeps the response before the current one, so a rate can be worked out from the two.
export function useMetricsSamples(current: ClusterMetrics | undefined) {
  const [samples, setSamples] = useState<{ previous?: ClusterMetrics; current?: ClusterMetrics }>({});
  if (current !== undefined && current.readAt !== samples.current?.readAt) {
    setSamples({ previous: samples.current, current });
  }
  return samples.current?.readAt === current?.readAt ? samples.previous : undefined;
}
