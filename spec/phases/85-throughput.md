# P85 · F41-B3 — Throughput
- **Milestone:** M15
- **Covers:** F41-AC3
- **Discovery:** —
- **Status:** Review

## Demo
1. In the Gateway repository, run `go test ./internal/metrics ./internal/kafka -run "EndOffsets|Metrics"`; in the UI, `npx vitest run src/groups/computeThroughput.test.ts src/components/TopicThroughput.test.tsx src/components/ClusterMetrics.test.tsx`.
2. In the browser, the Metrics tab first says "Measuring…"; after the next refresh it shows messages per second for the cluster and for each topic that received messages; a topic whose end offsets went down shows no rate.

## Tasks
- [x] **T85.1 Gateway end-offset sums** — Covers: F41-AC3
  - Files: Gateway internal/metrics/metrics.go, internal/metrics/read_end_offsets.go (new, port), internal/kafka/read_end_offsets.go (new, with test), internal/metrics/get_metrics.go and its test, cmd/gateway/main.go
  - Do: `ReadEndOffsets` lists end offsets for the topics the health read found and sums them per topic; a topic with a partition error carries that error instead of a sum. `GetMetrics` adds `endOffsets` (`topics: [{topic, endOffset (decimal string), error}]` sorted by name, or a section `error`); without a health read there are no topic names and the section is unavailable with that reason.
  - Done when: `go test ./internal/metrics ./internal/kafka` (per package) passes, covering sums beyond 2^53, a partition error and an unavailable section; then `go test ./...` passes.
- [x] **T85.2 Throughput in the Metrics tab** — Covers: F41-AC3
  - Files: UI src/gateway/getMetrics.ts, src/groups/computeThroughput.ts (new, with test), src/hooks/useMetricsSamples.ts (new), src/components/TopicThroughput.tsx (new, with test), src/components/ClusterMetrics.tsx (adds a Refresh now button), src/components/ClusterMetrics.test.tsx
  - Do: `useMetricsSamples` keeps the previous and current responses; `computeThroughput` returns messages per second per topic ((end-offset sum change) ÷ seconds between `readAt`s, with BigInt differences; no rate for a decrease, a missing topic or an error) and the cluster total of known rates. `TopicThroughput` shows "Measuring…" until two samples exist, then the cluster rate and a table of topics with a rate (highest first), noting topics without a rate.
  - Done when: `npx vitest run src/groups/computeThroughput.test.ts src/components/TopicThroughput.test.tsx src/components/ClusterMetrics.test.tsx` passes; then `npm test` and `npm run build` pass.

## Review
