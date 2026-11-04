# P16 · F5-B1 — Read latest messages
- **Milestone:** M2
- **Covers:** F5-AC1
- **Discovery:** —
- **Status:** Done        <!-- Planned | Building | Review | Done -->

## Demo
1. Produce records to at least two `orders` partitions in the dev stack.
2. Open Dev → Topics → `orders` → Messages; verify the newest records appear first with partition, offset, timestamp, key, value, and headers, and no more than 50 records are returned.

## Tasks
- [x] **T16.1 Latest-message action** — Covers: F5-AC1
  - Files: `internal/topics/topic_message.go` (new), `internal/topics/fetch_topic_messages.go` (new), `internal/topics/compare_topic_messages_by_recency.go` (new), `internal/topics/compare_topic_messages_by_recency_test.go` (new), `internal/topics/list_latest_topic_messages.go` (new), `internal/topics/list_latest_topic_messages_test.go` (new)
  - Do: Define the message DTO and Kafka fetch port; add an action that applies the Kafka timeout, sorts records newest-first with deterministic ties, and returns at most 50.
  - Done when: `go test ./internal/topics/...` passes checks for ordering, tie order, the 50-record cap, empty results, errors, and deadline propagation.
- [x] **T16.2 Kafka reader and wiring** — Covers: F5-AC1
  - Files: `internal/kafka/list_latest_topic_messages.go` (new), `internal/kafka/topic_message_from_record.go` (new), `internal/kafka/topic_message_from_record_test.go` (new), `test/integration/list_latest_topic_messages_test.go` (new)
  - Do: Use a dedicated short-lived franz-go reader per request with direct partition offsets, avoiding shared consumer assignment across concurrent requests. Read a bounded latest window per partition, then let the action select the newest 50. Verify real Kafka records from multiple partitions.
  - Done when: When Docker is available, `CGO_ENABLED=0 go test -tags integration ./test/integration/...` passes `TestListLatestTopicMessages_ReturnsNewestAcrossPartitions`; without Docker, `go test -run '^$' -tags integration ./test/integration/...` compiles the integration package and `go test ./...` passes. Record an unavailable Docker runtime as not run in Review.
- [x] **T16.3 Latest-message HTTP route** — Covers: F5-AC1
  - Files: `internal/httpapi/register_list_latest_topic_messages.go` (new), `internal/httpapi/register_list_latest_topic_messages_test.go` (new), `cmd/gateway/main.go`
  - Do: Register `GET /api/v1/topics/{topic}/messages`; return a JSON array, map a missing topic to 404 `not_found`, and map Kafka failures to 503 `cluster_unreachable`; wire the action and route in the composition root.
  - Done when: `go test ./internal/httpapi/...` passes response-shape, empty-array, 404, and 503 checks; `go test ./...` passes.
- [x] **T16.4 UI latest-message data access** — Covers: F5-AC1
  - Files: `src/gateway/types.ts`, `src/gateway/listLatestTopicMessages.ts` (new), `src/gateway/listLatestTopicMessages.test.ts` (new), `src/hooks/useLatestTopicMessages.ts` (new), `src/hooks/useLatestTopicMessages.test.tsx` (new)
  - Do: Add the typed request and gateway/topic-keyed query for latest messages; disable automatic retries so the explicit Retry control handles errors.
  - Done when: `npm test -- listLatestTopicMessages useLatestTopicMessages` passes URL encoding, response, error, and query behavior tests.
- [x] **T16.5 Topic Messages view** — Covers: F5-AC1
  - Files: `src/components/MessageTable.tsx` (new), `src/components/MessageTable.test.tsx` (new), `src/components/TopicTabs.tsx` (new), `src/pages/TopicMessagesPage.tsx` (new), `src/pages/TopicPage.tsx`, `src/pages/TopicPage.test.tsx`, `src/pages/TopicDetailPage.tsx`, `src/App.tsx`, `src/App.test.tsx`, `src/main.tsx`
  - Do: Add a Messages route/tab to the topic page and render partition, offset, timestamp, key, value, and headers. Reuse loading and Retry patterns and show an explicit empty state.
  - Done when: `npm test -- TopicPage MessageTable App` passes message rendering, navigation, loading, empty, and error/Retry cases; `npm test` and `npm run build` exit 0.

## Review
- `go test ./...` passed in Gateway. Integration-tagged tests compiled with `go test -run '^$' -tags integration ./test/integration/...`; the real Kafka test was not run because Docker is unavailable.
- Focused UI tests passed (11 tests), the full suite passed (121 tests), and `npm run build` passed.
- `git diff --check` passed in both repositories. The pre-existing untracked `configs/dev.yaml` was left unchanged.
