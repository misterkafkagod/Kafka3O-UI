# P27 · F14 — Delete a topic
- **Milestone:** M5
- **Covers:** F14-AC2
- **Discovery:** —
- **Status:** Done

## Demo
1. Cancel a topic deletion, then confirm it and observe the accepted request.

## Tasks
- [x] **T27.1 Delete topics through the gateway** — Covers: F14-AC2
  - Files: Gateway delete-topic action/port/tests, Kafka adapter/tests, HTTP route/tests, composition root, integration test
  - Do: Request deletion and distinguish missing topics from broker failures.
  - Done when: focused action, Kafka mapping and HTTP tests pass; `go test ./...` passes and the integration test compiles or runs with Docker.
- [x] **T27.2 Confirm topic deletion in the UI** — Covers: F14-AC2
  - Files: UI delete-topic client/tests, confirmation control/tests, topic detail/composition wiring
  - Do: Require a confirmation dialog, send nothing on cancel, disable duplicate submissions, refresh cached topics and explain asynchronous deletion.
  - Done when: focused UI tests, `npm test`, and `npm run build` pass.

## Review
- **Demo:** Cancel then confirm passed in isolated Chrome against a mocked gateway: cancel sent no request, confirm sent one, and asynchronous acceptance was displayed. Actual Kafka deletion was **not run**: the integration test could not start a Docker provider on this host.
- **Vulnerability scan:** `npm audit --audit-level=low`: 0 findings. `govulncheck -test -tags integration`: one called standard-library finding, GO-2026-6809 / CVE-2026-111943 (medium, fixed in Go 1.27.3), and one uncalled module-only finding, GO-2026-5932 (`golang.org/x/crypto/openpgp`, not imported by the shipped gateway). Container image scan was **not run** without Docker.
- **Notes:** Confirmation is a browser dialog; accepted deletion may complete asynchronously. The no-retry administrative client distinguishes a missing topic from an unconfirmed broker result.
