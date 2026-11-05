# P23 · F11 — Topic consumer groups
- **Milestone:** M4
- **Covers:** F11-AC1, F11-AC2
- **Discovery:** —
- **Status:** Done

## Demo
1. Open a topic's Consumers tab.
2. Verify only groups associated with the topic and their topic-specific partition lag appear.

## Tasks
- [x] **T23.1 Show topic consumers** — Covers: F11-AC1, F11-AC2
  - Files: `src/components/TopicConsumerGroups.tsx` (new), `src/components/TopicConsumerGroups.test.tsx` (new), topic-group filter and tests (new), `src/components/TopicTabs.tsx`, `src/pages/TopicPage.tsx`, `src/App.tsx`, related route tests
  - Do: Reuse the group query and lag rendering for one topic, show explicit empty and per-group error states, preserve gateway failure/retry, and distinguish groups whose topic association cannot be determined from groups known to consume this topic.
  - Done when: focused UI tests cover topic filtering, empty results, group errors and retry; `npm test` and `npm run build` pass.

## Review
- **Tests (2026-11-04):** Gateway `go test ./...` passed; the integration package compiled without running tests. UI `npm test` passed 203 tests and `npm run build` passed.
- **Demo (initial review):** real-Kafka steps were not run because Docker was unavailable. A browser check with mocked gateway responses passed for exact offsets, topic-only rows, and unresolved-group warnings; it is not a real-Kafka demo.
- **Follow-up (2026-11-05):** The shared consumer-group adapter passed a classic/modern group integration test against a disposable Kafka broker; the topic-specific browser demo remains unrun.
- **Vulnerability scan:** `npm audit` reported 0 findings. `govulncheck -test -tags integration ./...` reported the previously recorded called GO-2026-6809 (medium; fixed in Go 1.27.3) and one uncalled module advisory.
- **Notes:** Groups whose association is unknown appear as warnings rather than being misidentified as consumers or hidden. Node v22.21.0 remains below the declared UI runtime.
