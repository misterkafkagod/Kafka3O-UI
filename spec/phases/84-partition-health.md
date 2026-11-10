# P84 · F41-B2 — Partition health and largest topics
- **Milestone:** M15
- **Covers:** F41-AC2
- **Discovery:** [cluster-metrics-sources](../discovery/cluster-metrics-sources.md)
- **Status:** Review

## Demo
1. In the Gateway repository, run `go test ./internal/metrics ./internal/kafka -run "Health|TopicSizes|LogDirs|Metrics" ./internal/httpapi -run Metrics`.
2. In the browser, the Metrics tab shows topics and partitions, under-replicated, below min ISR and offline partitions, and the 10 largest topics by size on disk (internal topics included).

## Tasks
- [x] **T84.1 Gateway partition health and topic sizes** — Covers: F41-AC2
  - Files: Gateway internal/metrics/metrics.go, internal/metrics/read_partition_health.go (new, port), internal/kafka/read_partition_health.go (new, with test), internal/kafka/read_log_dirs.go and its test (per-topic sizes), internal/metrics/summarize_partition_health.go (new, with test), internal/metrics/largest_topics.go (new, with test), internal/metrics/compare_topic_sizes.go (new, with test), internal/metrics/get_metrics.go and its test, cmd/gateway/main.go
  - Do: `ReadPartitionHealth` reads metadata with internal topics and each topic's `min.insync.replicas`; per topic it counts partitions, under-replicated (ISR < replicas), offline (no leader or partition error) and below min ISR (ISR < min ISR; unknown when the configuration is unreadable). `GetMetrics` adds `partitions` (totals, unreadable topics, `minIsrError`, `error`) and `largestTopics` (10 largest by summed replica size from the log directories, then by name; unavailable with the log directory error).
  - Done when: `go test ./internal/metrics ./internal/kafka ./internal/httpapi` (per package) passes, covering an offline, an under-replicated and a below-min-ISR partition, unreadable configuration, an unreadable topic and the top-10 cut; then `go test ./...` passes.
- [x] **T84.2 Partition health and largest topics in the Metrics tab** — Covers: F41-AC2
  - Files: UI src/gateway/getMetrics.ts, src/components/PartitionHealth.tsx (new, with test), src/components/PartitionHealth.module.css (new), src/components/LargestTopics.tsx (new, with test), src/components/ClusterMetrics.tsx, src/components/ClusterMetrics.test.tsx
  - Do: `PartitionHealth` lists Topics, Partitions, Under-replicated, Below min ISR (Unknown with the reason when unreadable) and Offline, highlights non-zero problems, and names unreadable topics; `LargestTopics` is a table of topic and size. Section errors read "Unavailable: <reason>".
  - Done when: `npx vitest run src/components/PartitionHealth.test.tsx src/components/LargestTopics.test.tsx src/components/ClusterMetrics.test.tsx` passes; then `npm test` and `npm run build` pass.

## Review
