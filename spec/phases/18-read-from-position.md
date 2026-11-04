# P18 · F6-B1 + F6-B2 — Read from a partition position
- **Milestone:** M2
- **Covers:** F6-AC1, F6-AC2, F6-AC3
- **Discovery:** —
- **Status:** Planned        <!-- Planned | Building | Review | Done -->

## Demo
1. Open `orders` → Messages; choose a partition and read from a known offset, verifying records start at that offset and are in offset order.
2. Read the same partition from a timestamp in Unix milliseconds and verify records start at or after it.
3. Submit an unknown partition or negative offset and verify a validation error is shown.

## Tasks
- [ ] **T18.1 Position-read action and validation** — Covers: F6-AC1, F6-AC2, F6-AC3
  - Files: `internal/topics/read_topic_messages.go` (new), `internal/topics/read_topic_messages_test.go` (new), `internal/topics/topic_message.go` (from T16.1), `internal/topics/fetch_topic_messages.go` (from T16.1)
  - Do: Add a read request with a partition and exactly one of offset or timestamp; validate non-negative inputs and reject invalid combinations; apply the configured timeout and cap results at 50. Keep the existing latest-message behavior when no position is supplied.
  - Done when: `go test ./internal/topics/...` passes checks for offset and timestamp requests, invalid combinations/negative positions, result cap, empty results, errors, and deadline propagation.
- [ ] **T18.2 Kafka position reader** — Covers: F6-AC1, F6-AC2
  - Files: `internal/kafka/list_latest_topic_messages.go` (from T16.2), `test/integration/read_topic_messages_test.go` (new), `cmd/gateway/main.go` (from T16.2)
  - Do: Read from the requested partition and offset, or resolve the timestamp with Kafka's offset lookup and read from the resulting offset. Preserve offset order and return an empty array when the requested point is at or beyond the end.
  - Done when: `CGO_ENABLED=0 go test -tags integration ./test/integration/...` passes `TestReadTopicMessages_FromOffsetAndTimestamp`; `go test ./...` passes.
- [ ] **T18.3 Position query validation and HTTP responses** — Covers: F6-AC3
  - Files: `internal/httpapi/register_list_latest_topic_messages.go` (from T16.3), `internal/httpapi/register_list_latest_topic_messages_test.go` (from T16.3), `internal/httpapi/new_invalid_position.go` (new)
  - Do: Extend the message endpoint with optional `partition`, `offset`, and Unix-millisecond `timestamp` query parameters; require a partition and exactly one starting position; return 400 `invalid_position` for invalid requests.
  - Done when: `go test ./internal/httpapi/...` passes valid offset/timestamp, incompatible/missing parameters, negative values, missing-topic 404, and Kafka-error 503 checks; `go test ./...` passes.
- [ ] **T18.4 UI position request** — Covers: F6-AC1, F6-AC2
  - Files: `src/gateway/listLatestTopicMessages.ts` (from T16.4), `src/gateway/listLatestTopicMessages.test.ts` (from T16.4), `src/hooks/useLatestTopicMessages.ts` (from T16.4), `src/hooks/useLatestTopicMessages.test.tsx` (from T16.4)
  - Do: Extend the message request and query key with the selected partition/position, encoding the query parameters and keeping the latest-message query distinct.
  - Done when: `npm test -- listLatestTopicMessages useLatestTopicMessages` passes exact offset/timestamp URLs, distinct query keys, errors, and latest-mode behavior.
- [ ] **T18.5 UI position form** — Covers: F6-AC1, F6-AC2, F6-AC3
  - Files: `src/components/ReadTopicMessagesForm.tsx` (new), `src/components/ReadTopicMessagesForm.test.tsx` (new), `src/pages/TopicPage.tsx` (from T16.5), `src/pages/TopicPage.test.tsx` (from T16.5)
  - Do: Add a form for partition plus offset or timestamp (Unix milliseconds); submit the selected position, display returned records in offset order, and surface gateway validation details.
  - Done when: `npm test -- ReadTopicMessagesForm TopicPage` passes offset, timestamp, and validation-error cases; `npm test` and `npm run build` exit 0.

## Review
