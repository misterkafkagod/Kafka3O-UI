# P97 · F59-B1 — Kafka Connect health
- **Milestone:** M17
- **Covers:** F59-AC1
- **Discovery:** —
- **Status:** Building

## Demo
1. Kafka A's Metrics tab: the Kafka Connect section counts connectors and tasks by state and lists `kafka3o-verify-failing`'s failed task with its error.
2. Kafka B: "Kafka Connect is not configured for this cluster."; `/metrics` has `kafka3o_connect_tasks{state="FAILED"} 1` on gateway-a.

## Tasks
- [x] **T97.1 Gateway: Connect section** — Covers: F59-AC1
  - Files: Kafka3O-Gateway internal/metrics/metrics.go, internal/metrics/sources.go, internal/metrics/summarize_connect.go (new), internal/metrics/summarize_connect_test.go (new), internal/metrics/get_metrics.go, internal/metrics/get_metrics_test.go, internal/metrics/write_prometheus_text.go, internal/metrics/write_prometheus_text_test.go, cmd/gateway/main.go
  - Do: `Sources.Connectors` is the existing `connect.ListConnectors`; `SummarizeConnect` counts connectors and tasks by state (a connector with a failed task counts as its own state, as on the Connect tab) and lists failed connectors and tasks with their error summary; not configured → `notConfigured: true` and no `section_up` line; unreachable → the section's error; Prometheus `kafka3o_connect_connectors{state}`, `kafka3o_connect_tasks{state}`.
  - Done when: `go test ./internal/metrics/ -run 'Connect|GetMetrics|WritePrometheusText'` passes covering mixed states, failures, not configured and unreachable.
- [ ] **T97.2 UI: Connect section and CSV** — Covers: F59-AC1
  - Files: src/gateway/getMetrics.ts, src/components/ConnectMetrics.tsx (new), src/components/ConnectMetrics.test.tsx (new), src/components/ClusterMetrics.tsx, src/metrics/metricsToCsv.ts, src/metrics/metricsToCsv.test.ts
  - Do: state counts for connectors and tasks, a list of failures; "Kafka Connect is not configured for this cluster."; "Unavailable: <reason>"; CSV `connect_connectors`/`connect_tasks` rows with the state as name.
  - Done when: `npx vitest run src/components/ConnectMetrics src/metrics/metricsToCsv` passes.

## Review
