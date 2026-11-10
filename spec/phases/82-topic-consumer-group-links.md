# P82 · F52-B4 — Group links from a topic's consumers
- **Milestone:** M14
- **Covers:** F52-AC4
- **Discovery:** —
- **Status:** Planned

## Demo
1. Run `npx vitest run src/components/TopicConsumerGroups.test.tsx`.
2. In the browser, on a topic's Consumers tab, a group's name opens that group's page.

## Tasks
- [ ] **T82.1 Link topic consumers to the group page** — Covers: F52-AC4
  - Files: src/components/ConsumerGroupDetails.tsx, src/components/ConsumerGroupDetails.test.tsx, src/components/TopicConsumerGroups.tsx, src/components/TopicConsumerGroups.test.tsx
  - Do: `ConsumerGroupDetails` takes an optional group page path and then shows the group's heading as a link to it; the topic's Consumers tab passes the path for each associated group. Topic-specific rows and unresolved associations stay as they are.
  - Done when: `npx vitest run src/components/ConsumerGroupDetails.test.tsx src/components/TopicConsumerGroups.test.tsx` passes; then `npm test` and `npm run build` pass.

## Review
