# P37 · F21-B3 — Browse topics, partitions and configuration
- **Milestone:** M7
- **Covers:** F21-AC3
- **Discovery:** —
- **Status:** Building

## Demo
1. Filter topics, include internal topics and open a topic with an encoded name.
2. Inspect partition offsets and configuration, including a sensitive value, while confirming existing create and delete controls remain available.

## Tasks
- [x] **T37.1 Organize topic filters and results** — Covers: F21-AC3
  - Files: `src/components/TopicList.tsx`, `src/components/TopicTable.tsx`, `src/components/TopicList.module.css` (new), and their tests
  - Do: Group filtering and internal-topic controls, show a truthful visible-result count and retain distinct empty/no-match states. Preserve sorted names, approximate counts and encode both gateway and topic route segments.
  - Done when: `npm test -- src/components/TopicList.test.tsx src/components/TopicTable.test.tsx src/pages/ClusterPage.test.tsx` and `npm run build` pass.
- [ ] **T37.2 Organize topic detail sections** — Covers: F21-AC3
  - Files: `src/pages/TopicDetailPage.tsx`, `src/pages/TopicPage.tsx`, `src/pages/TopicDetailPage.module.css` (new), and their tests
  - Do: Group topic identity, partitions and configuration into responsive, clearly labeled sections with only factual summaries. Keep exact existing values, sensitive-value masking, delete behavior and failure recovery; encode gateway IDs in back links.
  - Done when: `npm test -- src/pages/TopicDetailPage.test.tsx src/pages/TopicPage.test.tsx src/components/DeleteTopic.test.tsx` and `npm run build` pass.

## Review
