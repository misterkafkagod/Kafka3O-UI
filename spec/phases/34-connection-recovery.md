# P34 · F20-B3 — Recover safely from credential and transport errors
- **Milestone:** M6
- **Covers:** F20-AC3
- **Discovery:** —
- **Status:** Done

## Demo
1. Submit invalid credentials, then replace them after a 401; verify an explicit correction path and no token in visible output or URLs.
2. Simulate a gateway transport failure; verify the UI offers network/gateway/TLS checks without claiming which one caused the failure, introduces no certificate bypass, and leaves the other gateway usable.

## Tasks
- [x] **T34.1 Give generic transport failures accurate troubleshooting guidance** — Covers: F20-AC3
  - Files: `src/gateway/describeGatewayTransportFailure.ts` (new), `src/gateway/describeGatewayError.ts`, `src/components/GatewayErrorRecovery.tsx` (new), `src/components/ErrorWithRetry.tsx`, `src/components/ClusterCard.tsx`, the three write components, and their tests
  - Do: Explain network, gateway and CORS checks, and suggest verifying certificate trust only for HTTPS; state that a browser transport failure does not reliably identify its cause. Reuse this guidance for unconfirmed writes without obscuring their uncertain outcome. Keep authentication and cluster-unreachable errors distinct and do not bypass certificate validation.
  - Done when: `npm test -- src/gateway/describeGatewayTransportFailure.test.ts src/gateway/describeGatewayError.test.ts src/components/GatewayErrorRecovery.test.tsx src/components/ClusterCard.test.tsx src/components/ErrorWithRetry.test.tsx src/components/CreateTopic.test.tsx src/components/DeleteTopic.test.tsx src/components/ProduceTopicMessage.test.tsx` and `npm run build` pass.
- [x] **T34.2 Verify credential correction and gateway isolation end to end** — Covers: F20-AC3
  - Files: `src/App.test.tsx` (from T28.1), `src/components/GatewayCredentialsPanel.tsx` (from T33.1), `src/components/ClusterCard.tsx` (from T33.2), `src/components/GatewayCredentialForm.test.tsx`, `src/components/CrossClusterTopicSearch.test.tsx`
  - Do: Add an App-level regression that recovers a gateway from 401 through its contextual connection action while a second gateway remains usable; verify invalid or rejected tokens are never rendered and a transport failure does not interrupt independent results.
  - Done when: `npm test -- src/App.test.tsx src/components/GatewayCredentialForm.test.tsx src/components/CrossClusterTopicSearch.test.tsx` passes and `npm run build` passes.

## Review
- **Demo:** Synthetic browser and App-level checks rejected invalid input, recovered from a 401 with a corrected token, and kept a second gateway healthy and searchable. Tokens were absent from visible output and URLs. A simulated transport failure offered network, gateway, CORS and HTTPS certificate-trust checks without claiming a cause or bypassing certificate validation.
- **EKS-D:** The manual deployment serves `kafka3o-manual-ui-p34`; its JavaScript and CSS match the Node 24 production build byte for byte. Both forwarded gateways passed pinned-certificate HTTPS, authentication, Kafka metadata and CORS checks. Kafka A and B remained Ready (1/1); no Kafka writes were made. The live browser showed the expected certificate-trust guidance until the new self-signed certificates are accepted.
- **Validation:** `npm test` passed all 304 tests in 82 files and `npm run build` passed with Node 24.21.0. The deployed connection dialog opened and returned focus to its invoker.
- **Vulnerability scan:** `npm audit --audit-level=low` and `npm audit --omit=dev --audit-level=low` each reported 0 vulnerabilities on 2026-11-06. The Node runtime itself was not scanned.
- **Notes:** Existing write handlers were retained; credential correction never automatically repeats a write. No dependency or speculative option was added. The manual pod replacement rotated its temporary credentials and certificates, and the localhost tunnel was restored.
