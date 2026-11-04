# P23 · F11 — Topic consumer groups
- **Milestone:** M4
- **Covers:** F11-AC1, F11-AC2
- **Discovery:** —
- **Status:** Planned

## Demo
1. Open a topic's Consumers tab.
2. Verify only groups associated with the topic and their topic-specific partition lag appear.

## Tasks
- [ ] **T23.1 Show topic consumers** — Covers: F11-AC1, F11-AC2
  - Files: `src/components/TopicConsumerGroups.tsx` (new), `src/components/TopicConsumerGroups.test.tsx` (new), `src/components/TopicTabs.tsx`, `src/pages/TopicPage.tsx`, `src/App.tsx`, related route tests
  - Do: Reuse the group query and lag rendering for one topic, show explicit empty and per-group error states, and preserve gateway failure/retry.
  - Done when: focused UI tests cover topic filtering, empty results, group errors and retry; `npm test` and `npm run build` pass.

## Review
