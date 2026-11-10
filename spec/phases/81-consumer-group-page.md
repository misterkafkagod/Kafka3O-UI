# P81 · F52-B2 + F52-B3 — Group page
- **Milestone:** M14
- **Covers:** F52-AC2, F52-AC3
- **Discovery:** —
- **Status:** Planned

## Demo
1. Run `npx vitest run src/components/ConsumerGroupPage.test.tsx src/components/ConsumerGroupList.test.tsx src/components/AppShell.test.tsx`.
2. In the browser, clicking a group in the list opens `/clusters/:id/consumer-groups/:group` with its members, one offsets table per topic and the offset reset; the breadcrumb reads Clusters › cluster › Consumer groups › group. Opening an unknown group name says "Consumer group not found" with a link back to the list.

## Tasks
- [ ] **T81.1 Group page** — Covers: F52-AC2, F52-AC3
  - Files: src/components/ConsumerGroupPage.tsx (new), src/components/ConsumerGroupPage.module.css (new), src/components/ConsumerGroupPage.test.tsx (new), src/components/ConsumerGroupTopicOffsets.tsx (new), src/components/ConsumerGroupTopicOffsets.test.tsx (new), src/components/ConsumerGroupDetails.tsx
  - Do: The page reads the shared group snapshot, finds the group by id and shows state, members, one partition table per topic (`ConsumerGroupTopicOffsets`: partition, committed, log start, log end, lag, status, error) and the offset reset. Not reported → "Consumer group not found" with a link back to the list; a group error → the error with Retry and no invented rows; Gateway errors use `ErrorWithRetry`. `ConsumerGroupDetails` reuses the members table unchanged.
  - Done when: `npx vitest run src/components/ConsumerGroupPage.test.tsx src/components/ConsumerGroupTopicOffsets.test.tsx` passes, covering found, not found, group error and Gateway error.
- [ ] **T81.2 Route, list links and breadcrumb** — Covers: F52-AC2
  - Files: src/App.tsx, src/pages/ClusterPage.tsx, src/components/ClusterTabs.tsx, src/components/ConsumerGroups.tsx, src/components/ConsumerGroups.test.tsx, src/components/ConsumerGroupList.tsx, src/components/ConsumerGroupList.test.tsx, src/components/AppShell.tsx, src/components/AppShell.test.tsx
  - Do: Route `/clusters/:gatewayId/consumer-groups/:groupId` renders the group page under the Consumer groups tab. The list's group names link to the page (URL-encoded) and a click anywhere on a row opens it; the list page no longer stacks every group's details. The breadcrumb adds the group name after Consumer groups.
  - Done when: `npx vitest run src/components/ConsumerGroupList.test.tsx src/components/ConsumerGroups.test.tsx src/components/AppShell.test.tsx` passes; then `npm test` and `npm run build` pass.

## Review
