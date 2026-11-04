# P15 · F4-B1 + F4-B2 — Topic partitions and configuration
- **Milestone:** M2
- **Covers:** F4-AC1, F4-AC2
- **Discovery:** —
- **Status:** Planned        <!-- Planned | Building | Review | Done -->

## Demo
1. Start the `kafka-dev` and `gateway-dev` services from `deploy/compose.dev.yaml`.
2. Open Dev → Topics → `orders`; verify the page shows partitions in ID order with leader, replicas, ISR, start/end offsets, and configuration without exposing sensitive values.
3. Stop `kafka-dev`; click Retry and verify the topic page shows the cluster-unavailable message.

## Tasks
- [ ] **T15.1 Gateway topic detail action** — Covers: F4-AC1, F4-AC2
  - Files: `internal/topics/topic_detail.go` (new), `internal/topics/describe_topic.go` (new), `internal/topics/get_topic_detail.go` (new), `internal/topics/get_topic_detail_test.go` (new)
  - Do: Define topic detail, partition, and config DTOs; add the Kafka port and a timeout-bounded `GetTopicDetail` action. Return the port error unchanged and distinguish a missing topic with a stable sentinel error.
  - Done when: `go test ./internal/topics/...` passes tests for returned detail, missing-topic/error propagation, and the configured deadline.
- [ ] **T15.2 Kafka detail adapter and wiring** — Covers: F4-AC1
  - Files: `internal/kafka/describe_topic.go` (new), `test/integration/get_topic_detail_test.go` (new), `cmd/gateway/main.go`
  - Do: Adapt Kafka metadata, per-partition start/end offsets, and topic configs into the DTO; sort partitions and configs; never include sensitive config values. Wire the adapter into `GetTopicDetail`.
  - Done when: `CGO_ENABLED=0 go test -tags integration ./test/integration/...` passes `TestGetTopicDetail_ReturnsPartitionsOffsetsAndConfig`; `go test ./...` passes.
- [ ] **T15.3 Topic detail HTTP route** — Covers: F4-AC2
  - Files: `internal/httpapi/register_get_topic_detail.go` (new), `internal/httpapi/register_get_topic_detail_test.go` (new), `internal/httpapi/new_topic_not_found.go` (new)
  - Do: Register `GET /api/v1/topics/{topic}`; map the missing-topic sentinel to 404 `not_found` and all Kafka failures to 503 `cluster_unreachable`.
  - Done when: `go test ./internal/httpapi/...` passes checks for the detail JSON, missing-topic 404, and Kafka-error 503; `go test ./...` passes.
- [ ] **T15.4 UI topic-detail data access** — Covers: F4-AC1
  - Files: `src/gateway/types.ts`, `src/gateway/getTopicDetail.ts` (new), `src/gateway/getTopicDetail.test.ts` (new), `src/hooks/useTopicDetail.ts` (new), `src/hooks/useTopicDetail.test.tsx` (new)
  - Do: Add the typed detail request using an encoded topic path and a query keyed by gateway ID and topic name; disable automatic retries so the page's Retry action remains explicit.
  - Done when: `npm test -- getTopicDetail useTopicDetail` passes URL encoding, response, error, and query behavior tests.
- [ ] **T15.5 Topic detail page** — Covers: F4-AC1, F4-AC2
  - Files: `src/components/TopicTable.tsx`, `src/components/TopicTable.test.tsx`, `src/pages/TopicPage.tsx` (new), `src/pages/TopicPage.test.tsx` (new), `src/App.tsx`, `src/App.test.tsx`, `src/main.tsx`
  - Do: Link topic names to `/clusters/:gatewayId/topics/:topicName`; render the ordered partition/config detail, a back link to Topics, loading and not-found states, and `ErrorWithRetry` for retryable failures.
  - Done when: `npm test -- TopicPage TopicTable App` passes navigation, details, missing-topic and Retry cases; `npm test` and `npm run build` exit 0.

## Review
