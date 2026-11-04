# P21 · F9-B1 + F9-B2 — Copy and open a message link
- **Milestone:** M3
- **Covers:** F9-AC1, F9-AC2
- **Discovery:** —
- **Status:** Done

## Demo
1. Copy a message link and open it in a new tab.
2. Verify exactly its partition and offset are displayed; a missing offset reports that the record is unavailable.

## Tasks
- [x] **T21.1 Preserve exact Kafka offsets** — Covers: F9-AC1, F9-AC2
  - Files: `internal/topics/topic_message.go`, `internal/kafka/topic_message_from_record.go`, `internal/kafka/topic_message_from_record_test.go`, message HTTP and integration tests
  - Do: Add the decimal `offsetExact` string alongside the existing numeric offset so browser links can represent the full Kafka int64 range without rounding.
  - Done when: `go test ./internal/kafka/... ./internal/httpapi/...` checks exact serialization beyond JavaScript's safe integer range; `go test ./...` passes and integration tests compile or run with Docker.
- [x] **T21.2 Copy links from messages** — Covers: F9-AC1
  - Files: `src/messages/messageLink.ts` (new), `src/messages/messageLink.test.ts` (new), `src/messages/exactMessageOffset.ts` (new), `src/messages/exactMessageOffset.test.ts` (new), `src/components/CopyMessageLink.tsx` (new), `src/components/MessageTable.tsx`, related tests
  - Do: Create properly encoded links using exact offsets and a copy component with explicit clipboard success/failure; older gateways without exact offsets are supported only when the numeric offset is safe. Keep the component unwired until T21.3 can open the exact record.
  - Done when: focused UI tests check encoded URLs, large offsets, unsafe legacy offsets, clipboard success and failure; `npm test` and `npm run build` pass.
- [x] **T21.3 Open the exact linked record** — Covers: F9-AC2
  - Files: `src/pages/TopicMessagesPage.tsx`, `src/pages/TopicPage.tsx`, `src/App.tsx`, `src/main.tsx`, `src/components/LinkedTopicMessage.tsx` (new), `src/messages/topicMessageLinkPosition.ts` (new), `src/messages/topicMessageLinkPosition.test.ts` (new), `src/messages/findLinkedTopicMessage.ts` (new), `src/messages/findLinkedTopicMessage.test.ts` (new), `src/hooks/useLatestTopicMessages.ts`, `src/gateway/types.ts`, related page and client tests
  - Do: Wire the copy component; validate link position, read from that position, and display only an exact partition/offset match; distinguish unavailable or invalid links.
  - Done when: focused UI tests cover existing, skipped, expired, malformed, large-offset and unreachable records; `npm test` and `npm run build` pass.

## Review
- **Tests:** Gateway `go test ./...` passed and integration tests compiled; UI `npm test` passed 183 tests and `npm run build` passed. Tests include copy-to-open navigation, exact int64 offsets, missing/expired positions, and clipboard failures.
- **Demo:** Both real-Kafka steps **not run** because Docker/Kafka is unavailable.
- **Vulnerability scan:** `npm audit` 2026-11-04: 0 findings. `govulncheck` 2026-11-04: GO-2026-6809 / CVE-2026-111943 is called in Go 1.27.2 (CISA CVSS 6.8 medium; upgrade to 1.27.3 pending); GO-2026-5932 is present at module level but not called.
- **Notes:** Kafka offsets exceed JavaScript's exact integer range; the additive `offsetExact` field preserves precision. Older gateways without it can only provide verifiable links for safe numeric offsets.
