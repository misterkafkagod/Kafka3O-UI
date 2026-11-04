# P21 · F9-B1 + F9-B2 — Copy and open a message link
- **Milestone:** M3
- **Covers:** F9-AC1, F9-AC2
- **Discovery:** —
- **Status:** Planned

## Demo
1. Copy a message link and open it in a new tab.
2. Verify exactly its partition and offset are displayed; a missing offset reports that the record is unavailable.

## Tasks
- [ ] **T21.1 Copy links from messages** — Covers: F9-AC1
  - Files: `src/messages/messageLink.ts` (new), `src/messages/messageLink.test.ts` (new), `src/components/MessageTable.tsx`, `src/components/MessageTable.test.tsx`, `src/pages/TopicMessagesPage.tsx`, composition wiring
  - Do: Create properly encoded links and expose a copy action with explicit clipboard success/failure.
  - Done when: focused UI tests check encoded URLs, clipboard success and failure; `npm test` and `npm run build` pass.
- [ ] **T21.2 Open the exact linked record** — Covers: F9-AC2
  - Files: `src/pages/TopicMessagesPage.tsx`, `src/messages/topicMessageLinkPosition.ts` (new), `src/messages/topicMessageLinkPosition.test.ts` (new), related page tests
  - Do: Validate link position, read from that position, and display only an exact partition/offset match; distinguish unavailable or invalid links.
  - Done when: focused UI tests cover existing, skipped, expired, malformed and unreachable records; `npm test` and `npm run build` pass.

## Review
