# P82 · F52-B4 — Group links from a topic's consumers
- **Milestone:** M14
- **Covers:** F52-AC4
- **Discovery:** —
- **Status:** Done

## Demo
1. Run `npx vitest run src/components/TopicConsumerGroups.test.tsx`.
2. In the browser, on a topic's Consumers tab, a group's name opens that group's page.

## Tasks
- [x] **T82.1 Link topic consumers to the group page** — Covers: F52-AC4
  - Files: src/components/ConsumerGroupDetails.tsx, src/components/ConsumerGroupDetails.test.tsx, src/components/TopicConsumerGroups.tsx, src/components/TopicConsumerGroups.test.tsx
  - Do: `ConsumerGroupDetails` takes an optional group page path and then shows the group's heading as a link to it; the topic's Consumers tab passes the path for each associated group. Topic-specific rows and unresolved associations stay as they are.
  - Done when: `npx vitest run src/components/ConsumerGroupDetails.test.tsx src/components/TopicConsumerGroups.test.tsx` passes; then `npm test` and `npm run build` pass.

## Review
- **Demo:** passed (auto-approved under the user's standing M14 instruction, 2026-11-10; run by Claude). Step 1: the named tests pass, including a group name with `&` and `/` round-tripping through the route. Step 2 in Chromium 1194: on `orders`' Consumers tab the `analytics` heading link opens its group page with its members.
- **Regression:** `npm test` 560 passed; `npm run build` passed.
- **Convention check:** only an optional `groupPath` prop was added; no new methods.
- **Vulnerability scan:** no dependency changes; `npm audit`: 0 vulnerabilities (2026-11-10, milestone close).
