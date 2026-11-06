# P29 · F18-B2 — Restore direct routes and browser history
- **Milestone:** M6
- **Covers:** F18-AC2
- **Discovery:** —
- **Status:** Done

## Demo
1. Open a direct exact-message URL for an encoded topic and verify the exact partition and offset.
2. In the updated manual-test UI, navigate between a topic view and its cluster section, then use browser Back and Forward; verify the route, breadcrumb and active section follow history.

## Tasks
- [x] **T29.1 Verify encoded direct routes and history restoration** — Covers: F18-AC2
  - Files: `src/App.test.tsx`
  - Do: Extend App integration tests to start from an encoded cluster/topic exact-message URL, navigate between existing views, then traverse Back and Forward and assert the rendered page, shell context, and exact partition/offset request. Preserve the existing URL contract; fix only regressions the test exposes.
  - Done when: `npm test -- src/App.test.tsx` passes direct-route, encoded-name, exact-position and Back/Forward assertions, and `npm run build` passes.

## Review
- **Demo:** EKS-D UI rollout and route/history checks passed (2026-11-06); the encoded exact-message URL rendered the expected breadcrumb, and Back/Forward restored the active section. Pinned-certificate probes passed HTTPS, auth, Kafka metadata and CORS for both Gateways. The live exact-message payload was not run in the integrated browser because the regenerated self-signed certificate requires manual acceptance; the exact partition/offset request passed in Vitest.
- **Vulnerability scan:** Not run; P29 changed no dependencies and is not the final M6 phase.
- **Notes:** Replacing the shared UI/Gateway pod rotates its memory-only tokens and certificates and terminates the port-forward; restore the tunnel and recopy test tokens after redeployment.
