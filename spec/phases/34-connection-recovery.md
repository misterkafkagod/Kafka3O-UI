# P34 · F20-B3 — Recover safely from credential and transport errors
- **Milestone:** M6
- **Covers:** F20-AC3
- **Discovery:** —
- **Status:** Planned

## Demo
1. Submit invalid credentials, then replace them after a 401; verify an explicit correction path and no token in visible output or URLs.
2. Simulate a gateway transport failure; verify the UI offers network/gateway/TLS checks without claiming which one caused the failure, introduces no certificate bypass, and leaves the other gateway usable.

## Tasks
- [ ] **T34.1 Give generic transport failures accurate troubleshooting guidance** — Covers: F20-AC3
  - Files: `src/gateway/describeGatewayError.ts`, `src/gateway/describeGatewayError.test.ts`, `src/components/ClusterCard.tsx`, `src/components/ClusterCard.test.tsx`
  - Do: Explain network and gateway checks, and suggest verifying certificate trust only for HTTPS; state that a browser transport failure does not reliably identify its cause. Keep authentication and cluster-unreachable errors distinct and do not bypass certificate validation.
  - Done when: `npm test -- src/gateway/describeGatewayError.test.ts src/components/ClusterCard.test.tsx src/components/ErrorWithRetry.test.tsx` passes assertions for the troubleshooting guidance and distinct error types.
- [ ] **T34.2 Verify credential correction and gateway isolation end to end** — Covers: F20-AC3
  - Files: `src/App.test.tsx` (from T28.1), `src/components/GatewayCredentialsPanel.tsx` (from T33.1), `src/components/ClusterCard.tsx` (from T33.2), `src/components/GatewayCredentialForm.test.tsx`, `src/components/CrossClusterTopicSearch.test.tsx`
  - Do: Add an App-level regression that recovers a gateway from 401 through its contextual connection action while a second gateway remains usable; verify invalid or rejected tokens are never rendered and a transport failure does not interrupt independent results.
  - Done when: `npm test -- src/App.test.tsx src/components/GatewayCredentialForm.test.tsx src/components/CrossClusterTopicSearch.test.tsx` passes and `npm run build` passes.

## Review
