# P96 · F57-B1 — Consumer group metrics
- **Milestone:** M17
- **Covers:** F57-AC1
- **Discovery:** —
- **Status:** Building

## Demo
1. Kafka A's Metrics tab: the Consumer groups section counts groups by state and lists each group's state, members, total lag and largest partition lag, the largest lag first.
2. Download CSV and `curl /metrics`: the same numbers (`kafka3o_consumer_group_lag{group=...}`); a group with unknown partition lag has no lag gauge but `kafka3o_consumer_group_unknown_lag_partitions`.

## Tasks
- [x] **T96.1 Gateway: consumer groups section** — Covers: F57-AC1
  - Files: Kafka3O-Gateway internal/metrics/metrics.go, internal/metrics/sources.go, internal/metrics/summarize_consumer_groups.go (new), internal/metrics/summarize_consumer_groups_test.go (new), internal/metrics/compare_group_lags.go (new), internal/metrics/compare_group_lags_test.go (new), internal/metrics/get_metrics.go, internal/metrics/get_metrics_test.go, internal/metrics/write_prometheus_text.go, internal/metrics/write_prometheus_text_test.go, cmd/gateway/main.go
  - Do: `Sources.Groups` is the existing `groups.ListConsumerGroups`; `SummarizeConsumerGroups` counts groups by state and gives each group its members, total lag (exact decimal sum of known partition lags), largest partition lag, the number of partitions with unknown lag, and its error; sorted by total lag (largest first, unknown/erroring last) then name; Prometheus `kafka3o_consumer_groups{state}`, `kafka3o_consumer_group_members`, `kafka3o_consumer_group_lag` and `..._max_partition_lag` only for fully known lag, `kafka3o_consumer_group_unknown_lag_partitions` otherwise, and `section_up{section="consumerGroups"}`.
  - Done when: `go test ./internal/metrics/ -run 'ConsumerGroups|GroupLags|GetMetrics|WritePrometheusText'` passes covering exact sums above 2^53, unknown partitions, erroring groups, empty groups, ordering and a failed read.
- [x] **T96.2 UI: consumer groups section and CSV** — Covers: F57-AC1
  - Files: src/gateway/getMetrics.ts, src/components/ConsumerGroupMetrics.tsx (new), src/components/ConsumerGroupMetrics.test.tsx (new), src/components/ClusterMetrics.tsx, src/metrics/metricsToCsv.ts, src/metrics/metricsToCsv.test.ts
  - Do: state counts and a table (group linked to its page, state, members, total lag, largest partition lag); partly unknown lag reads "at least N (k partitions unknown)"; CSV rows per state and group with the name column.
  - Done when: `npx vitest run src/components/ConsumerGroupMetrics src/metrics/metricsToCsv` passes.

## Review
