# P25 · F13 — Produce a test message
- **Milestone:** M5
- **Covers:** F13-AC1, F13-AC2
- **Discovery:** —
- **Status:** Done

## Demo
1. Produce a UTF-8 message with key and headers; use the returned partition and offset to read it back.

## Tasks
- [x] **T25.1 Produce through the gateway** — Covers: F13-AC1, F13-AC2
  - Files: Gateway message write types/action/port/tests, Kafka producer adapter/tests, HTTP route/tests, composition root, integration test
  - Do: Validate the request, produce a single message with optional key and headers, return partition and exact offset, and report unconfirmed delivery without retrying.
  - Done when: focused tests cover bytes, missing/empty key, headers, validation, exact offsets and failures; `go test ./...` passes and the integration test compiles or runs with Docker.
- [x] **T25.2 Add the message producer UI** — Covers: F13-AC1, F13-AC2
  - Files: UI write client/types/tests, producer component/tests, topic route/composition wiring
  - Do: Add the value/key/headers form, prevent duplicate submissions, show the result and explicit uncertain-delivery errors.
  - Done when: focused UI tests, `npm test`, and `npm run build` pass.

## Review
- **Demo:** A browser smoke test produced a synthetic value to a disposable Kafka broker and read it at the returned partition and offset. The authenticated HTTPS integration test also verified UTF-8 bytes, an empty key, and a header. The full key/header browser demo remains unrun; unit/UI tests cover duplicate submissions and uncertain delivery.
- **Vulnerability scan:** not required for this phase (no dependency changes); see P27 for the milestone scan.
- **Notes:** Producer requests and UI submissions are not automatically retried; an unconfirmed response may have already been written.
