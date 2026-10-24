# P08 · F2-B3 — Unknown cluster ID
- **Milestone:** M1
- **Covers:** F2-AC3
- **Discovery:** —
- **Status:** Done        <!-- Planned | Building | Review | Done -->

## Demo
1. Open http://localhost:5173/clusters/unknown → **Cluster not found** with a link back.
2. Click the link → the overview with both cards.

## Tasks
- [x] **T08.1 Cluster not found** — Covers: F2-AC3
  - Files: src/components/ClusterNotFound.tsx (new), src/components/ClusterNotFound.test.tsx (new), src/pages/ClusterPage.tsx (from T06.2), src/pages/ClusterPage.test.tsx (from T06.2)
  - Do: Once config has loaded and no entry matches `:gatewayId`, render `ClusterNotFound`: heading "Cluster not found", the unknown ID, and a link "Back to all clusters" to `/`. No gateway call is made.
  - Done when: `npm test` passes `ClusterPage` › "shows Cluster not found with a link to / (F2-AC3)" at `/clusters/unknown` (MSW unhandled-request error proves no gateway call; clicking the link shows the overview); build exits 0.

## Review
- **Demo:** passed (user, 2026-10-24) — run by Claude in headless Chromium against the dev stack, screenshots reviewed by the user: `/clusters/unknown` showed Cluster not found, the ID and the link, with no gateway requests; the link opened the overview with both cards
- **Vulnerability scan:** not required — no dependency changes in this phase
