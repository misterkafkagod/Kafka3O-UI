# P94 · F58-B2 — Controller quorum
- **Milestone:** M17
- **Covers:** F58-AC2
- **Discovery:** discovery/quorum-and-leader-metrics.md
- **Status:** Building

## Demo
1. Open Kafka A's Metrics tab: the Controller quorum section shows leader 1, its epoch and high watermark, and voter 1 with lag 0.
2. Download CSV: rows `quorum_leader`, `quorum_high_watermark` and `quorum_replica_lag` (name `voter`).
3. `curl` gateway-a's `/metrics`: `kafka3o_quorum_leader 1` and `kafka3o_quorum_replica_lag{replica="1",role="voter"} 0`.

## Tasks
- [ ] **T94.1 Gateway: quorum section** — Covers: F58-AC2
  - Files: Kafka3O-Gateway internal/metrics/metrics.go, internal/metrics/sources.go (new), internal/metrics/read_quorum.go (new), internal/metrics/get_metrics.go, internal/metrics/get_metrics_test.go, internal/metrics/write_prometheus_text.go, internal/metrics/write_prometheus_text_test.go, internal/kafka/read_quorum.go (new), internal/kafka/read_quorum_test.go (new), cmd/gateway/main.go
  - Do: `NewGetMetrics` takes a `Sources` struct (data-only) so new sections don't grow its argument list; `ReadQuorum` sends DescribeQuorum per the recipe, maps errors (top level, partition, missing partition), and gives each voter and observer its lag behind the leader's LEO (nil when the leader is unknown) and its last fetch/caught-up times (nil for −1); a failed read is the section's `error`; Prometheus gets `section_up{section="quorum"}`, `kafka3o_quorum_leader`, `kafka3o_quorum_high_watermark`, `kafka3o_quorum_replica_lag{replica,role}`.
  - Done when: `go test ./internal/metrics/ ./internal/kafka/ -run 'Quorum|GetMetrics|WritePrometheusText'` passes covering a healthy quorum, a lagging follower and an observer, an unknown leader, each error kind, and Prometheus output with and without the section.
- [ ] **T94.2 UI: quorum section and CSV** — Covers: F58-AC2
  - Files: src/gateway/getMetrics.ts, src/components/QuorumHealth.tsx (new), src/components/QuorumHealth.test.tsx (new), src/components/ClusterMetrics.tsx, src/components/ClusterMetrics.test.tsx, src/metrics/metricsToCsv.ts, src/metrics/metricsToCsv.test.ts
  - Do: the section shows leader, epoch, high watermark and a replica table (replica, role, log end offset, lag, last fetch), highlighting lag above 0; "Unavailable: <reason>" on error; the CSV gains a `name` column (`metric,broker,logDir,topic,name,value`) and quorum rows.
  - Done when: `npx vitest run src/components/QuorumHealth src/components/ClusterMetrics src/metrics/metricsToCsv` passes.

## Review
