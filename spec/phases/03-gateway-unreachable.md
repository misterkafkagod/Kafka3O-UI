# P03 · F1-B3 — Unreachable gateway is isolated to its card
- **Milestone:** M1
- **Covers:** F1-AC3
- **Discovery:** —
- **Status:** Planned        <!-- Planned | Building | Review | Done -->

## Demo
0. If Docker is remote, open the SSH tunnel for 8081/8082.
1. `docker compose -f deploy/compose.dev.yaml up -d` (from T02.4) and `npm run dev` → both cards Healthy.
2. `docker compose -f deploy/compose.dev.yaml stop gateway-prod`, reload → within 5 s "Prod" shows **Gateway unreachable**; "Dev" stays Healthy.

## Tasks
- [ ] **T03.1 Classify gateway errors** — Covers: F1-AC3
  - Files: src/gateway/types.ts (adds `GatewayErrorKind`), src/gateway/classifyGatewayError.ts (new), src/gateway/classifyGatewayError.test.ts (new)
  - Do: Pure `classifyGatewayError(error)` → `"gateway-unreachable"` for fetch network failure (`TypeError`), timeout (`TimeoutError`) or abort (`AbortError`); `"other"` for `HttpError` and anything else.
  - Done when: `npm test -- classifyGatewayError` passes: TypeError / TimeoutError / AbortError → gateway-unreachable; HttpError 500 and plain Error → other.

- [ ] **T03.2 Card shows Gateway unreachable** — Covers: F1-AC3
  - Files: src/hooks/useClusterStatus.ts, src/hooks/useClusterStatus.test.tsx, src/components/ClusterCard.tsx, src/components/ClusterCard.test.tsx, src/pages/ClustersPage.test.tsx
  - Do: `useClusterStatus` sets `retry: false` (React Query's default 3 retries × 5 s timeout would delay the error by ~20 s; polling in P05 re-checks). `ClusterCard` on error shows **Gateway unreachable** when the error classifies as `gateway-unreachable`, otherwise "Status unavailable".
  - Done when: `npm test` passes `ClustersPage` › "isolates an unreachable gateway to its card (F1-AC3)" (Dev healthy, Prod `HttpResponse.error()`) and › "shows Gateway unreachable when a gateway times out (F1-AC3)" (MSW delay > injected 50 ms timeout); `useClusterStatus` no-retry test (getCluster called once on failure); `npm run build` exits 0.

## Review
