# P05 · F1-B5 — Status refreshes every 15 s
- **Milestone:** M1
- **Covers:** F1-AC5
- **Discovery:** —
- **Status:** Done        <!-- Planned | Building | Review | Done -->

## Demo
1. With both cards Healthy, `docker compose -f deploy/compose.dev.yaml stop gateway-prod` → within 15 s "Prod" turns **Gateway unreachable** without a reload.
2. `docker compose -f deploy/compose.dev.yaml start gateway-prod` → within 15 s "Prod" is Healthy again.

## Tasks
- [x] **T05.1 Poll cluster status** — Covers: F1-AC5
  - Files: src/hooks/useClusterStatus.ts, src/hooks/useClusterStatus.test.tsx, src/components/ClusterCard.tsx, src/components/ClusterCard.test.tsx, src/pages/ClustersPage.tsx, src/pages/ClustersPage.test.tsx, src/App.tsx, src/App.test.tsx, src/main.tsx
  - Do: `useClusterStatus(gateway, getCluster, refreshMs)` sets `refetchInterval: refreshMs`; `main.tsx` injects 15000 through `App` → `ClustersPage` → `ClusterCard` (tests use ms). `ClusterCard` checks the **error state before data**: React Query keeps the last data after a failed refetch, so otherwise a failing gateway would stay "Healthy".
  - Done when: `npm test` passes `ClustersPage` › "turns a Healthy card into Gateway unreachable on the next refresh (F1-AC5)" (refreshMs 50, MSW handler switched to error after first success), `ClusterCard` › "error wins over stale data", `useClusterStatus` › "refetches every refreshMs"; build exits 0.

## Review
- **Demo:** passed (user, 2026-10-22) — without reloading, Prod went Healthy → Gateway unreachable after stopping `gateway-prod`, and back to Healthy after starting it, each within 15 s
- **Vulnerability scan:** not required — no dependency changes in this phase
- **Notes:**
  - React Query keeps the last data after a failed refetch; views must check the error state before data (P07, P12 already plan for it).
