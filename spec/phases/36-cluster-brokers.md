# P36 · F21-B2 — Inspect cluster and broker context
- **Milestone:** M7
- **Covers:** F21-AC2
- **Discovery:** —
- **Status:** Planned

## Demo
1. Open a healthy cluster and inspect its identity, controller, broker count and sorted broker table.
2. Simulate a failed refresh and verify recovery appears without stale metadata or a fabricated broker count.

## Tasks
- [ ] **T36.1 Organize cluster identity and broker details** — Covers: F21-AC2
  - Files: `src/components/ClusterDetails.tsx`, `src/components/ClusterDetails.module.css` (new), `src/components/ClusterDetails.test.tsx`, `src/components/BrokerTable.test.tsx`
  - Do: Group the gateway address and successful cluster metadata into a responsive, semantic summary with a factual broker count; introduce a clearly headed broker section. Preserve the existing sorted table, loading, authentication, error and retry behavior.
  - Done when: `npm test -- src/components/ClusterDetails.test.tsx src/components/BrokerTable.test.tsx src/pages/ClusterPage.test.tsx src/App.test.tsx` and `npm run build` pass.

## Review
