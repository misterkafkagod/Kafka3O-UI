# P19 · F7-B1 + F7-B2 — Bounded topic message search
- **Milestone:** M3
- **Covers:** F7-AC1, F7-AC2, F7-AC3
- **Discovery:** —
- **Status:** Building

## Demo
1. Produce matching and nonmatching records to multiple partitions.
2. Search from the Messages view and inspect matches, examined count, 500-position limit, and exclusion status.

## Tasks
- [x] **T19.1 Add message-search action** — Covers: F7-AC1, F7-AC2
  - Files: `internal/topics/search_topic_messages.go` (new), `internal/topics/search_topic_messages_test.go` (new), `internal/topics/fetch_recent_topic_messages.go` (new), `internal/topics/topic_message_search_result.go` (new)
  - Do: Add a timeout-bound action over an injected bounded-window port; validate non-empty search text, match key/value bytes, return count/exclusion status, and sort matches consistently.
  - Done when: `go test ./internal/topics/...` covers key/value matching, empty input, errors, count, sorting, and excluded windows; `go test ./...` passes.
- [x] **T19.2 Read a bounded partition window** — Covers: F7-AC1, F7-AC2
  - Files: `internal/kafka/fetch_recent_topic_messages.go` (new), `internal/kafka/allocate_recent_topic_offsets.go` (new), `internal/kafka/allocate_recent_topic_offsets_test.go` (new), `test/integration/search_topic_messages_test.go` (new)
  - Do: Fetch offsets and select a deterministic fair window across partitions with at most 500 offset positions total; reuse the existing reader, propagate errors, and report excluded positions.
  - Done when: `go test ./internal/kafka/...` covers empty, uneven, large, sparse and more-than-500-partition windows with exact bounds; `go test ./...` passes and the integration test compiles or runs with Docker.
- [x] **T19.3 Expose the search API** — Covers: F7-AC1, F7-AC2
  - Files: `internal/httpapi/register_search_topic_messages.go` (new), `internal/httpapi/register_search_topic_messages_test.go` (new), `internal/httpapi/new_invalid_search.go` (new), `cmd/gateway/main.go`
  - Do: Register and wire the search route; return the result shape and explicit invalid-query, not-found, and unavailable errors.
  - Done when: `go test ./internal/httpapi/...` checks success and all error paths; `go test ./...` passes.
- [ ] **T19.4 Add the UI search client and hook** — Covers: F7-AC3
  - Files: `src/gateway/searchTopicMessages.ts` (new), `src/gateway/searchTopicMessages.test.ts` (new), `src/gateway/types.ts`, `src/hooks/useSearchTopicMessages.ts` (new), `src/hooks/useSearchTopicMessages.test.tsx` (new)
  - Do: Add the search client and query independently by gateway, topic and search text.
  - Done when: focused client/hook tests and `npm test` pass; `npm run build` succeeds.
- [ ] **T19.5 Show search results** — Covers: F7-AC3
  - Files: `src/main.tsx`, `src/App.tsx`, `src/pages/TopicPage.tsx`, `src/pages/TopicMessagesPage.tsx`, `src/components/SearchTopicMessages.tsx` (new), `src/components/SearchTopicMessages.test.tsx` (new), related page tests
  - Do: Wire the search client and add a search form, limit/exclusion explanation, matching records, empty state and retry; keep latest and positioned reads available.
  - Done when: focused UI tests cover success, no matches, exclusion, invalid input and failure/retry; `npm test` and `npm run build` pass.

## Review
