# P28 · F18-B1 — Navigate with consistent shell and page context
- **Milestone:** M6
- **Covers:** F18-AC1
- **Discovery:** —
- **Status:** Done

## Demo
1. Open the updated manual-test UI.
2. Visit the overview, a cluster's Brokers, Topics and Consumer groups sections, and a topic's Details, Messages and Consumers views. Verify the active navigation, gateway/topic context and breadcrumb destinations on each page.

## Tasks
- [x] **T28.1 Build the application navigation shell** — Covers: F18-AC1
  - Files: `src/components/AppShell.tsx` (new), `src/App.tsx`, `src/App.test.tsx`
  - Do: Wrap the existing route tree in a persistent shell with accessible global navigation, active-section state and cluster/topic breadcrumbs built from React Router and the existing injected gateway configuration. Preserve every current route and contextual tab.
  - Done when: `npm test -- src/App.test.tsx` verifies overview, cluster and topic context/navigation, and `npm run build` passes.

## Review
- **Demo:** Local navigation checks passed (2026-11-06): overview, Brokers, Topics, Consumer groups, topic Details, Messages and Consumers context/breadcrumbs verified. EKS manual UI not run; gateway data requests in the local preview were blocked by browser CORS/certificate validation.
- **Vulnerability scan:** Not run; P28 changed no dependencies and is not the final M6 phase.
- **Notes:** None.
