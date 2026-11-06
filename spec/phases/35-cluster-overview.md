# P35 · F21-B1 — Review clusters and cross-cluster topic results
- **Milestone:** M7
- **Covers:** F21-AC1
- **Discovery:** —
- **Status:** Done

## Demo
1. Open an overview with two gateway fixtures at 320, 768 and 1440 CSS pixels; verify independently loading, healthy and failed cards show only available metadata.
2. Search across both gateways with one failing; verify the other gateway's matches remain usable and the failed gateway offers recovery.

## Tasks
- [x] **T35.1 Organize the responsive cluster overview** — Covers: F21-AC1
  - Files: `src/pages/ClustersPage.tsx`, `src/components/ClusterCard.tsx`, `src/components/ClusterOverview.module.css` (new), and their tests
  - Do: Add a clearly headed responsive card grid and factual configured-gateway context. Retain the existing independent status, authentication and transport states; encode gateway IDs in card links and never show unavailable metadata as a count.
  - Done when: `npm test -- src/pages/ClustersPage.test.tsx src/components/ClusterCard.test.tsx src/App.test.tsx` and `npm run build` pass.
- [x] **T35.2 Organize cross-cluster search results** — Covers: F21-AC1
  - Files: `src/components/CrossClusterTopicSearch.tsx`, `src/components/GatewayTopicSearchResults.tsx`, `src/components/CrossClusterTopicSearch.module.css` (new), `src/components/CrossClusterTopicSearch.test.tsx`
  - Do: Make the search and per-gateway results easy to scan in responsive layouts while preserving independent loading, no-match, authentication, failure and retry states. Do not fetch topics before the user enters search text.
  - Done when: `npm test -- src/components/CrossClusterTopicSearch.test.tsx src/pages/ClustersPage.test.tsx src/App.test.tsx` and `npm run build` pass.

## Review
- **Demo:** Browser fixtures showed an independently loading gateway, a healthy gateway and an unreachable gateway without fabricated counts. Search kept the healthy gateway's encoded topic link available alongside the failed gateway's Retry action. An encoded gateway link opened the correct cluster.
- **Responsive and contrast:** At 320, 768 and 1440 CSS pixels the page had no horizontal overflow; cards stacked at 320 and used two columns at wider sizes. New healthy, failure and muted card text measured at least 5.69:1 in light mode and 7.53:1 in dark mode.
- **Validation:** All 305 UI tests and the production build passed on Node 24.21.0. The M7 UI deployment remains deferred until the milestone's final phase to avoid repeatedly rotating the manual test credentials.
- **Vulnerability scan:** Not run; P35 adds no dependencies and is not the final M7 phase.
- **Notes:** The overview counts configured gateways, not healthy clusters. Existing query and recovery behavior remains independent per gateway.
