# P85 · F41-B3 — Throughput
- **Milestone:** M15
- **Covers:** F41-AC3
- **Discovery:** —
- **Status:** Done

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
- **Demo:** steps 1–2 passed (auto-approved under the user's standing M15 instruction, 2026-11-10; run by Claude). Gateway: end-offset sums beyond 2^53 as decimal strings, a partition error per topic, an unavailable section. UI: BigInt differences, no rate for a decrease, a new topic, an error or equal read times. Browser: "Measuring…" first; after Refresh now, "Cluster: 25 messages/s over the last 10 seconds" with `kafka3o-m10-verify` 25 messages/s.
- **Regression:** Gateway `go test ./...` passed; UI `npm test` passed; `npm run build` passed.
- **Convention check:** `read_end_offsets` (sorting through `CompareTopicEndOffsets`), `computeThroughput`, `useMetricsSamples`, `TopicThroughput`; the tab also gained a Refresh now button (plan amendment noted in T85.2).
- **Vulnerability scan (milestone close, 2026-11-10):** no new dependencies in either repository (the probe module under `discovery/cluster-metrics-sources/probe` is throwaway and not built into either product); UI `npm audit`: 0; Gateway `govulncheck@v1.9.0 -test -tags integration ./...`: 0 called, 1 uncalled in a required module (GO-2026-5932, unchanged).
