# P87 · F53-B2 — Prometheus endpoint
- **Milestone:** M15
- **Covers:** F53-AC2
- **Discovery:** [cluster-metrics-sources](../discovery/cluster-metrics-sources.md)
- **Status:** Building

## Demo
1. In the Gateway repository, run `go test ./internal/metrics -run Prometheus`, `go test ./internal/httpapi -run Prometheus`, `go test ./internal/config` and `go test ./cmd/gateway -run Metrics`.
2. On EKS-D after deployment: `curl --cacert <gateway CA> -H "Authorization: Bearer $KAFKA3O_METRICS_TOKEN" https://<gateway-a>:9464/metrics` returns Prometheus text with Kafka A's gauges; without the token it returns 401; `/api/v1/cluster` on that port returns 404.

## Tasks
- [x] **T87.1 Prometheus text** — Covers: F53-AC2
  - Files: Gateway internal/metrics/write_prometheus_text.go (new, with test), internal/metrics/escape_label_value.go (new, with test), internal/metrics/sum_topic_sizes.go (new, with test), internal/metrics/largest_topics.go and its test
  - Do: `WritePrometheusText` writes exposition format 0.0.4: `kafka3o_metrics_section_up{section}` (1/0), `kafka3o_log_dir_total_bytes`, `_usable_bytes`, `_kafka_bytes` `{broker,dir}` (left out when unknown or failed), `kafka3o_topics`, `kafka3o_partitions{state="all|under_replicated|below_min_isr|offline"}`, `kafka3o_topic_size_bytes{topic}` for every topic (`SumTopicSizes`, which `LargestTopics` now cuts to 10) and the counter `kafka3o_topic_end_offset_total{topic}`; label values escaped (`\`, `"`, newline).
  - Done when: `go test ./internal/metrics` passes, covering a full sample, an unavailable section, an unknown size and label escaping.
- [ ] **T87.2 Metrics listener with its own token** — Covers: F53-AC2
  - Files: Gateway internal/httpapi/new_prometheus_handler.go (new, with test), internal/config/config.go, internal/config/load_config.go, internal/config/load_config_test.go, cmd/gateway/new_metrics_http_server.go (new, with test), cmd/gateway/main.go, deploy/kubernetes/secured-test/deployment.yaml
  - Do: `NewPrometheusHandler` answers only `GET /metrics` (404 elsewhere, 405 for other methods) with `text/plain; version=0.0.4`. `metrics.listen` (empty = off) starts a second TLS server on the Gateway certificate behind `WithBearerAuth` with `KAFKA3O_METRICS_TOKEN` (environment only; a token in the config file is rejected; a listener without a token stops the Gateway at start). The EKS-D manifest turns it on for gateway-a on `:9464` with the token from the optional Secret `kafka3o-metrics-token`.
  - Done when: `go test ./internal/httpapi ./internal/config ./cmd/gateway` (per package) passes, covering 401 without the token, 404 for API paths and the start refusal without a token; then `go test ./...` passes.

## Review
