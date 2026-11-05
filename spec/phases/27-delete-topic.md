# P27 · F14 — Delete a topic
- **Milestone:** M5
- **Covers:** F14-AC2
- **Discovery:** —
- **Status:** Building

## Demo
1. Cancel a topic deletion, then confirm it and observe the accepted request.

## Tasks
- [x] **T27.1 Delete topics through the gateway** — Covers: F14-AC2
  - Files: Gateway delete-topic action/port/tests, Kafka adapter/tests, HTTP route/tests, composition root, integration test
  - Do: Request deletion and distinguish missing topics from broker failures.
  - Done when: focused action, Kafka mapping and HTTP tests pass; `go test ./...` passes and the integration test compiles or runs with Docker.
- [ ] **T27.2 Confirm topic deletion in the UI** — Covers: F14-AC2
  - Files: UI delete-topic client/tests, confirmation control/tests, topic detail/composition wiring
  - Do: Require a confirmation dialog, send nothing on cancel, disable duplicate submissions, refresh cached topics and explain asynchronous deletion.
  - Done when: focused UI tests, `npm test`, and `npm run build` pass.

## Review
