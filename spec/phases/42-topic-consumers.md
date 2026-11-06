# P42 · F23-B2 — Investigate topic-specific consumer groups
- **Milestone:** M8
- **Covers:** F23-AC2
- **Discovery:** —
- **Status:** Planned

## Demo
1. Inspect a topic with an associated group and verify its summary links only to that topic's partition rows.
2. Exercise an unresolved association and retry without presenting it as a definite empty result.

## Tasks
- [ ] **T42.1 Add topic-scoped group summary navigation** — Covers: F23-AC2
  - Files: `src/components/TopicConsumerGroups.tsx`, `src/components/ConsumerGroupSummary.tsx` (from T41.1), `src/components/TopicConsumerGroups.test.tsx`, `src/pages/TopicPage.test.tsx`, `src/App.test.tsx`
  - Do: Reuse the group summary for associated topic consumers, identify the topic context, and retain filtered partitions, unresolved associations, individual errors and gateway retry.
  - Done when: `npm test -- src/components/TopicConsumerGroups.test.tsx src/pages/TopicPage.test.tsx src/App.test.tsx` and `npm run build` pass.

## Review
