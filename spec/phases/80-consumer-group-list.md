# P80 · F52-B1 — Consumer group list
- **Milestone:** M14
- **Covers:** F52-AC1
- **Discovery:** —
- **Status:** Done

## Demo
1. Run `npx vitest run src/groups/consumerGroupTotalLag.test.ts src/components/ConsumerGroupList.test.tsx src/components/ConsumerGroups.test.tsx`.
2. In the browser, a cluster's Consumer groups tab opens on a table with one row per group (name, state, members, topics, total lag), sorted by name; a group with an unknown partition lag shows "Unknown (n partitions)".

## Tasks
- [x] **T80.1 Total lag of a group** — Covers: F52-AC1
  - Files: src/groups/consumerGroupTotalLag.ts (new), src/groups/consumerGroupTotalLag.test.ts (new)
  - Do: Sums the decimal-string lags of a group's partitions with `BigInt`; returns `{ kind: "known", lag }`, `{ kind: "unknown", partitions }` when any partition's lag is null (unknown lags are never counted as zero), or `{ kind: "none" }` when the group has no partition offsets.
  - Done when: `npx vitest run src/groups/consumerGroupTotalLag.test.ts` passes, covering a sum beyond `Number.MAX_SAFE_INTEGER`, unknown partitions and no partitions.
- [x] **T80.2 Consumer group list table** — Covers: F52-AC1
  - Files: src/components/ConsumerGroupList.tsx (new), src/components/ConsumerGroupList.module.css (new), src/components/ConsumerGroupList.test.tsx (new), src/components/ConsumerGroups.tsx, src/components/ConsumerGroups.test.tsx
  - Do: A table "Consumer groups" with Group, State, Members, Topics and Total lag, sorted by name; the group name links to the group's details (the existing anchor until P81); an incomplete group is marked. `ConsumerGroups` shows it in place of `ConsumerGroupSummary`; loading, empty and error states stay.
  - Done when: `npx vitest run src/components/ConsumerGroupList.test.tsx src/components/ConsumerGroups.test.tsx` passes; then `npm test` and `npm run build` pass.

## Review
- **Demo:** passed (auto-approved under the user's standing M14 instruction, 2026-11-10; run by Claude). Step 1: the named tests pass. Step 2 in Chromium 1194 with a synthesized Gateway: the tab shows one row per group sorted by name (`analytics` Stable 1 1 0; `billing` Empty 0 2 "Unknown (1 partition)") and no stacked group details.
- **Regression:** `npm test` 560 passed (5 opt-in skipped); `npm run build` passed.
- **Convention check:** `consumerGroupTotalLag` and `ConsumerGroupList` are one function each, named after their file.
- **Vulnerability scan:** no dependency changes; `npm audit`: 0 vulnerabilities (2026-11-10, milestone close).
