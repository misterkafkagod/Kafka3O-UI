# P32 · F19-B3 — Show truthful loading, empty, error and partial-result states
- **Milestone:** M6
- **Covers:** F19-AC3
- **Discovery:** —
- **Status:** Building

## Demo
1. Use the existing UI fixtures to exercise loading, no configured gateways, empty data, no search matches, authentication failure, gateway failure and cluster failure.
2. Search across two gateways with one failing; verify the healthy gateway's results remain visible, failures offer recovery where possible, and unavailable data is never presented as zero or healthy.

## Tasks
- [x] **T32.1 Announce cluster, configuration and topic loading states** — Covers: F19-AC3
  - Files: `src/config/loadGatewayConfig.ts`, `src/components/GatewayConfigError.tsx` (new), `src/components/ClusterCard.tsx`, `src/components/ClusterDetails.tsx`, `src/pages/ClustersPage.tsx`, `src/pages/ClusterPage.tsx`, `src/pages/TopicPage.tsx`, `src/components/TopicList.tsx`, `src/pages/TopicDetailPage.tsx`, and their tests
  - Do: Expose changing loading/checking messages as accessible status announcements. Distinguish configuration transport/server failures from the existing missing, invalid or empty configuration state and offer Retry on every route. Preserve authentication, gateway and cluster states and error-before-stale-data handling.
  - Done when: `npm test -- src/config/loadGatewayConfig.test.ts src/components/GatewayConfigError.test.tsx src/components/ClusterCard.test.tsx src/components/ClusterDetails.test.tsx src/pages/ClustersPage.test.tsx src/pages/ClusterPage.test.tsx src/pages/TopicPage.test.tsx src/components/TopicList.test.tsx src/pages/TopicDetailPage.test.tsx` passes with loading, configuration recovery and existing state behavior covered.
- [ ] **T32.2 Announce message, consumer and cross-cluster loading states** — Covers: F19-AC3
  - Files: `src/pages/TopicMessagesPage.tsx`, `src/components/LinkedTopicMessage.tsx`, `src/components/SearchTopicMessages.tsx`, `src/components/ConsumerGroups.tsx`, `src/components/TopicConsumerGroups.tsx`, `src/components/GatewayTopicSearchResults.tsx`, `src/pages/TopicPage.test.tsx`, `src/components/SearchTopicMessages.test.tsx`, `src/components/ConsumerGroups.test.tsx`, `src/components/TopicConsumerGroups.test.tsx`, `src/components/CrossClusterTopicSearch.test.tsx`
  - Do: Expose these loading states accessibly while preserving distinct empty/no-match and error states, retry actions and successful cross-cluster results when another gateway fails.
  - Done when: `npm test -- src/pages/TopicPage.test.tsx src/components/SearchTopicMessages.test.tsx src/components/ConsumerGroups.test.tsx src/components/TopicConsumerGroups.test.tsx src/components/CrossClusterTopicSearch.test.tsx` passes and `npm run build` passes.

## Review
