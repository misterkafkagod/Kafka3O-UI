# P26 · F14 — Create a topic
- **Milestone:** M5
- **Covers:** F14-AC1, F14-AC3
- **Discovery:** —
- **Status:** Done

## Demo
1. Create a topic with explicit partition and replication counts and verify it appears in the topic list.

## Tasks
- [x] **T26.1 Create topics through the gateway** — Covers: F14-AC1, F14-AC3
  - Files: Gateway create-topic action/port/tests, Kafka adapter/tests, HTTP route/tests, composition root, integration test
  - Do: Validate names and counts, map duplicate-topic and broker errors, and request creation.
  - Done when: focused validation, Kafka mapping and HTTP tests pass; `go test ./...` passes and the integration test compiles or runs with Docker.
- [x] **T26.2 Add topic creation UI** — Covers: F14-AC1, F14-AC3
  - Files: UI create-topic client/types/tests, form/page/route/tests, composition root
  - Do: Provide a form, prevent duplicate submissions, surface conflicts and uncertain outcomes, and refresh the topic list after success.
  - Done when: focused UI tests, `npm test`, and `npm run build` pass.

## Review
- **Demo:** Real-broker creation and list visibility were **not run** because no Docker or reachable test broker was available. The integration test compiled; unit/UI tests cover Kafka name/count boundaries, conflicts, uncertain outcomes, duplicate submission prevention, and topic-list refresh.
- **Vulnerability scan:** not required for this phase (no dependency changes); the milestone scan remains due.
- **Notes:** Kafka administrative writes use the no-retry client; all cached gateway topic lists are invalidated after creation so aliases refresh too.
