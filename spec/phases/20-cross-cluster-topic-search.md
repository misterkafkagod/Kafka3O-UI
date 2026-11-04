# P20 · F8-B1 + F8-B2 — Search topic names across gateways
- **Milestone:** M3
- **Covers:** F8-AC1, F8-AC2
- **Discovery:** —
- **Status:** Review

## Demo
1. Search for `orders` across two configured clusters and open a matching topic.
2. Stop one gateway and verify the other cluster's matches remain visible and the failed cluster offers Retry.

## Tasks
- [x] **T20.1 Add independent cross-cluster search** — Covers: F8-AC1, F8-AC2
  - Files: `src/components/CrossClusterTopicSearch.tsx` (new), `src/components/CrossClusterTopicSearch.test.tsx` (new), `src/components/GatewayTopicSearchResults.tsx` (new), `src/pages/ClustersPage.tsx`, `src/App.tsx`, related page tests
  - Do: Reuse the topic-list API and existing name filtering, querying each gateway independently and rendering cluster-labelled links and per-gateway retry.
  - Done when: focused UI tests cover case-insensitive matches, links, no matches, and one failure alongside successful results; `npm test` and `npm run build` pass.

## Review
