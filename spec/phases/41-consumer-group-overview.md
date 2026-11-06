# P41 · F23-B1 — Navigate cluster consumer-group summaries and details
- **Milestone:** M8
- **Covers:** F23-AC1
- **Discovery:** —
- **Status:** Done

## Demo
1. Open a cluster with multiple groups and navigate by keyboard from the summary to a group's member and partition-lag details.
2. Inspect exact offsets and distinct lag statuses; retry an incomplete group and a gateway failure.

## Tasks
- [x] **T41.1 Add consumer-group summary navigation** — Covers: F23-AC1
  - Files: `src/components/ConsumerGroups.tsx`, `src/components/ConsumerGroupDetails.tsx`, `src/components/ConsumerGroupDetails.module.css` (new), `src/components/ConsumerGroupSummary.tsx` and its CSS/test (new), `src/groups/consumerGroupAnchor.ts` and its test (new), and affected component tests
  - Do: Add compact, accessible summary links to the existing details, showing reported group state without inventing health or lag totals. Preserve exact offsets, individual errors, retries and all existing details; support encoded group IDs and narrow screens.
  - Done when: `npm test -- src/components/ConsumerGroups.test.tsx src/components/ConsumerGroupDetails.test.tsx src/pages/ClusterPage.test.tsx src/App.test.tsx` and `npm run build` pass.

## Review
- **Demo:** Browser fixtures navigated by keyboard from an encoded group summary link to the focused detail, showed exact offsets and distinct lag statuses, and recovered from an incomplete group followed by a gateway failure.
- **Responsive:** The summary and detail pages had no page-wide overflow at 320, 768 or 1440 CSS pixels; wide tables stayed in their scroll regions.
- **Validation:** All 320 UI tests and the production build passed on Node 24.21.0. The M8 deployment remains deferred until the milestone's final phase.
- **Vulnerability scan:** Not run; P41 adds no dependencies and is not the final M8 phase.
