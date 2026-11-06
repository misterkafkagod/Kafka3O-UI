# P36 · F21-B2 — Inspect cluster and broker context
- **Milestone:** M7
- **Covers:** F21-AC2
- **Discovery:** —
- **Status:** Done

## Demo
1. Open a healthy cluster and inspect its identity, controller, broker count and sorted broker table.
2. Simulate a failed refresh and verify recovery appears without stale metadata or a fabricated broker count.

## Tasks
- [x] **T36.1 Organize cluster identity and broker details** — Covers: F21-AC2
  - Files: `src/components/ClusterDetails.tsx`, `src/components/ClusterDetails.module.css` (new), `src/components/ClusterDetails.test.tsx`, `src/components/BrokerTable.test.tsx`, `src/pages/ClusterPage.test.tsx`, `src/App.test.tsx`
  - Do: Group the gateway address and successful cluster metadata into a responsive, semantic summary with a factual broker count; introduce a clearly headed broker section. Preserve the existing sorted table, loading, authentication, error and retry behavior.
  - Done when: `npm test -- src/components/ClusterDetails.test.tsx src/components/BrokerTable.test.tsx src/pages/ClusterPage.test.tsx src/App.test.tsx` and `npm run build` pass.

## Review
- **Demo:** A browser fixture showed the gateway address, cluster ID, controller, a factual three-broker count and broker IDs sorted 1, 2, 3. After a simulated failed refresh, the summary and table disappeared and a recoverable gateway error appeared.
- **Responsive:** The broker page had no page-wide horizontal overflow at 320, 768 or 1440 CSS pixels; the existing labeled table scroll region remains available.
- **Validation:** All 307 UI tests and the production build passed on Node 24.21.0. The M7 deployment remains deferred until the milestone's final phase.
- **Vulnerability scan:** Not run; P36 adds no dependencies and is not the final M7 phase.
- **Notes:** Zero brokers is shown only when the successful gateway response actually contains an empty broker list.
