# P95 · F58-B1 — Leader balance per broker
- **Milestone:** M17
- **Covers:** F58-AC1
- **Discovery:** discovery/quorum-and-leader-metrics.md
- **Status:** Building

## Demo
1. Kafka A's Metrics tab: the Brokers section shows broker 1 leading 39 partitions, holding 39 replicas, 0 non-preferred leaders.
2. Download CSV: `broker_leaders`, `broker_replicas`, `broker_non_preferred_leaders` rows for broker 1; `/metrics` has `kafka3o_broker_leaders{broker="1"} 39`.

## Tasks
- [x] **T95.1 Gateway: brokers section** — Covers: F58-AC1
  - Files: Kafka3O-Gateway internal/metrics/metrics.go, internal/metrics/sources.go, internal/metrics/read_broker_leaders.go (new), internal/metrics/get_metrics.go, internal/metrics/get_metrics_test.go, internal/metrics/write_prometheus_text.go, internal/metrics/write_prometheus_text_test.go, internal/kafka/read_broker_leaders.go (new), internal/kafka/read_broker_leaders_test.go (new), cmd/gateway/main.go
  - Do: one `kadm` Metadata read (internal topics included); per broker, partitions led, replicas held and leaders that are not the first replica; brokers without partitions appear with zeros; offline partitions are not counted as led; sorted by broker; Prometheus `kafka3o_broker_leaders`, `kafka3o_broker_replicas`, `kafka3o_broker_non_preferred_leaders` and `section_up{section="brokers"}`.
  - Done when: `go test ./internal/metrics/ ./internal/kafka/ -run 'BrokerLeaders|GetMetrics|WritePrometheusText'` passes covering balanced, skewed and non-preferred leaders, an idle broker, an offline partition and a failed read.
- [ ] **T95.2 UI: brokers section and CSV** — Covers: F58-AC1
  - Files: src/gateway/getMetrics.ts, src/components/BrokerLeaders.tsx (new), src/components/BrokerLeaders.test.tsx (new), src/components/ClusterMetrics.tsx, src/metrics/metricsToCsv.ts, src/metrics/metricsToCsv.test.ts
  - Do: table per broker (leaders, replicas, non-preferred leaders), highlighting non-preferred leaders; "Unavailable: <reason>"; CSV rows per broker.
  - Done when: `npx vitest run src/components/BrokerLeaders src/metrics/metricsToCsv` passes.

## Review
