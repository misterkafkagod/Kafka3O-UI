# P07 · F2-B2 — Cluster page error with Retry
- **Milestone:** M1
- **Covers:** F2-AC2
- **Discovery:** —
- **Status:** Building        <!-- Planned | Building | Review | Done -->

## Demo
1. `docker compose -f deploy/compose.dev.yaml stop gateway-dev`, open `/clusters/dev` → **Gateway unreachable** and a **Retry** button.
2. `docker compose -f deploy/compose.dev.yaml start gateway-dev`, click Retry → brokers appear.

## Tasks
- [x] **T07.1 Error message and Retry components** — Covers: F2-AC2
  - Files: src/gateway/describeGatewayError.ts (new), src/gateway/describeGatewayError.test.ts (new), src/components/ErrorWithRetry.tsx (new), src/components/ErrorWithRetry.test.tsx (new)
  - Do: `describeGatewayError(error)` → `{title, detail?}` using `classifyGatewayError` (from T03.1/T04.2): gateway-unreachable → "Gateway unreachable"; cluster-unreachable → "Cluster unreachable" + problem detail; other → "Something went wrong" + error message. `ErrorWithRetry({error, onRetry})` renders `role="alert"` with title, detail and a **Retry** button.
  - Done when: `npm test -- describeGatewayError ErrorWithRetry` passes the three kinds and "Retry calls onRetry once".

- [ ] **T07.2 Cluster page error state** — Covers: F2-AC2
  - Files: src/components/ClusterDetails.tsx (from T06.2), src/components/ClusterDetails.test.tsx (from T06.2), src/pages/ClusterPage.test.tsx (from T06.2)
  - Do: `ClusterDetails` checks error before data (like the card) and renders `ErrorWithRetry` wired to `refetch()`.
  - Done when: `npm test` passes `ClusterPage` › "shows an error with Retry, then the brokers after Retry (F2-AC2)" (MSW network error → alert + Retry; handler switched to success; click Retry → broker rows); build exits 0.

## Review
