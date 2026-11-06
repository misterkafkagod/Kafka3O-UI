# P40 · F22-B3 — Inspect and share exact message links
- **Milestone:** M7
- **Covers:** F22-AC3
- **Discovery:** —
- **Status:** Done

## Demo
1. Copy the selected record's link with an encoded topic and a large decimal offset; reopen it and inspect only the exact record.
2. Open unavailable and unverifiable positions and verify neither displays a neighboring record or offers a misleading link.

## Tasks
- [x] **T40.1 Identify and verify linked message inspection** — Covers: F22-AC3
  - Files: `src/components/LinkedTopicMessage.tsx`, `src/components/MessageWorkspace.tsx` and `src/components/MessageInspector.tsx` (from T38.1), `src/components/MessageWorkspace.test.tsx` (from T38.1), `src/pages/TopicPage.test.tsx`, `src/App.test.tsx`
  - Do: Clearly identify a verified linked record in the shared inspector; preserve invalid, unavailable and unverifiable-position errors and exact decimal links. Verify changing the selected record does not leave a previous copy-success message or link attached to the new record.
  - Done when: `npm test -- src/components/MessageWorkspace.test.tsx src/messages/findLinkedTopicMessage.test.ts src/pages/TopicPage.test.tsx src/App.test.tsx` and `npm run build` pass.

## Review
- **Demo:** Browser fixtures copied and reopened a link with encoded names and a large decimal offset. Only the verified record appeared; unavailable and unverifiable positions offered no misleading link. Selecting a different record cleared the previous copy status and link.
- **Validation:** All 317 UI tests and the production build passed on Node 24.21.0. `npm audit` and `npm audit --omit=dev` each reported 0 vulnerabilities; the Node runtime itself remains not scanned.
- **EKS-D:** The M7 build and both Gateway endpoints were served through the restored manual-test tunnel. Both Gateways passed pinned-certificate HTTPS, authentication, Kafka metadata and CORS checks; Kafka A and B remained Ready. Read-only checks covered Kafka A's topic list, latest reads and bounded search, and Kafka B's topic list. An exact-position read was not run because no records were available in the sampled topics; Kafka B had no non-internal topic. No Kafka writes were made.
- **Browser limitation:** Authenticated live-browser inspection was not run because the regenerated test certificates require manual browser acceptance and the new tokens must be entered by the tester.
- **Notes:** An inspector is labeled verified only after the requested partition and exact offset have both been matched.
