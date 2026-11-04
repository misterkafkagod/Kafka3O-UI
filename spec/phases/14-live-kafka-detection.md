# P14 · F1-B4 correction — Detect a stopped Kafka cluster
- **Milestone:** M1
- **Covers:** F1-AC8
- **Discovery:** —
- **Status:** Building        <!-- Planned | Building | Review | Done -->

## Demo
1. Start the dev stack and confirm the Dev cluster is Healthy.
2. Stop only the dev Kafka broker; within 15 seconds the Dev card shows Cluster unreachable while the gateway remains running.

## Tasks
- [x] **T14.1 Request live cluster metadata** — Covers: F1-AC8
  - Files: `internal/kafka/request_metadata.go` (new), `internal/kafka/request_metadata_test.go` (new), `internal/kafka/describe_cluster.go`, `internal/kafka/describe_cluster_test.go`, `cmd/gateway/main.go`, `test/integration/describe_cluster_test.go`
  - Do: Request broker metadata directly from Kafka for each health check rather than using cached kadm metadata; preserve the cluster response and propagate request and broker errors.
  - Done when: `go test ./internal/kafka/...` covers a successful metadata response followed by a failed live request, response mapping, and timeout/error propagation; `go test ./...` passes.
- [x] **T14.2 Request live topic metadata** — Covers: F1-AC8
  - Files: `internal/kafka/list_topic_metadata.go`, `internal/kafka/list_topic_metadata_test.go` (new), `cmd/gateway/main.go`, `test/integration/list_topics_test.go`
  - Do: Use the same live metadata request for topic lists, preserving internal-topic, partition, and replication-factor behavior and returning Kafka errors explicitly.
  - Done when: `go test ./internal/kafka/...` covers topic mapping, empty results, authorization errors, and a successful response followed by a failed request; `go test ./...` passes.
- [ ] **T14.3 Verify a stopped broker** — Covers: F1-AC8
  - Files: `test/integration/start_kafka.go`, `test/integration/start_kafka_with_container.go` (new), `test/integration/live_metadata_test.go` (new)
  - Do: Exercise cluster and topic metadata against a broker, stop that test container, and verify both requests fail rather than returning cached success.
  - Done when: With Docker, `go test -tags integration ./test/integration/...` passes the stopped-broker test; otherwise `go test -run '^$' -tags integration ./test/integration/...` compiles it, with the live test and demo recorded as not run.

## Review
