# P81 · F52-B2 + F52-B3 — Group page
- **Milestone:** M14
- **Covers:** F52-AC2, F52-AC3
- **Discovery:** —
- **Status:** Done

## Demo
1. Run `npx vitest run src/components/ConsumerGroupPage.test.tsx src/components/ConsumerGroupList.test.tsx src/components/AppShell.test.tsx`.
2. In the browser, clicking a group in the list opens `/clusters/:id/consumer-groups/:group` with its members, one offsets table per topic and the offset reset; the breadcrumb reads Clusters › cluster › Consumer groups › group. Opening an unknown group name says "Consumer group not found" with a link back to the list.

## Tasks
- [x] **T81.1 Group page** — Covers: F52-AC2, F52-AC3
  - Files: src/components/ConsumerGroupPage.tsx (new), src/components/ConsumerGroupPage.module.css (new), src/components/ConsumerGroupPage.test.tsx (new), src/components/ConsumerGroupTopicOffsets.tsx (new), src/components/ConsumerGroupTopicOffsets.test.tsx (new), src/components/ConsumerGroupMembers.tsx (new, extracted from ConsumerGroupDetails), src/components/ConsumerGroupMembers.test.tsx (new), src/components/ConsumerGroupDetails.tsx
  - Do: The page reads the shared group snapshot, finds the group by id and shows state, members, one partition table per topic (`ConsumerGroupTopicOffsets`: partition, committed, log start, log end, lag, status, error) and the offset reset. Not reported → "Consumer group not found" with a link back to the list; a group error → the error with Retry and no invented rows; Gateway errors use `ErrorWithRetry`. `ConsumerGroupMembers` (moved out of `ConsumerGroupDetails`, which now uses it) shows the members table on both.
  - Done when: `npx vitest run src/components/ConsumerGroupPage.test.tsx src/components/ConsumerGroupTopicOffsets.test.tsx` passes, covering found, not found, group error and Gateway error.
- [x] **T81.2 Route, list links and breadcrumb** — Covers: F52-AC2
  - Files: src/App.tsx, src/pages/ClusterPage.tsx, src/components/ClusterTabs.tsx, src/components/ConsumerGroups.tsx, src/components/ConsumerGroups.test.tsx, src/components/ConsumerGroupList.tsx, src/components/ConsumerGroupList.test.tsx, src/components/AppShell.tsx, src/components/AppShell.test.tsx, src/components/ConsumerGroupDetails.tsx and its test (offset reset moves to the group page), src/pages/ClusterPage.test.tsx, src/App.test.tsx
  - Do: Route `/clusters/:gatewayId/consumer-groups/:groupId` renders the group page under the Consumer groups tab. The list's group names link to the page (URL-encoded) and a click anywhere on a row opens it; the list page no longer stacks every group's details. The breadcrumb adds the group name after Consumer groups.
  - Done when: `npx vitest run src/components/ConsumerGroupList.test.tsx src/components/ConsumerGroups.test.tsx src/components/AppShell.test.tsx` passes; then `npm test` and `npm run build` pass.

## Review
- **Demo:** passed (auto-approved under the user's standing M14 instruction, 2026-11-10; run by Claude). Step 1: the named tests pass. Step 2 in Chromium 1194: clicking a row opens `/clusters/dev/consumer-groups/billing` with members, one offsets table per topic (exact `9007199254740993`, "No committed offset"), Reset offsets, the breadcrumb Clusters / Dev / Consumer groups / billing and the Consumer groups tab current; `/consumer-groups/missing` says "Consumer group not found." and its link returns to the list.
- **Regression:** `npm test` 560 passed; `npm run build` passed.
- **Convention check:** `ConsumerGroupPage`, `ConsumerGroupTopicOffsets` and `ConsumerGroupMembers` (extracted from `ConsumerGroupDetails` by a plan amendment) are one component each. The offset reset moved from the list's stacked details to the group page, so `ConsumerGroupDetails` no longer takes it.
- **Vulnerability scan:** no dependency changes; `npm audit`: 0 vulnerabilities (2026-11-10, milestone close).
