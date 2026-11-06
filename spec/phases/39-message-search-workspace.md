# P39 · F22-B2 — Inspect bounded message search results
- **Milestone:** M7
- **Covers:** F22-AC2
- **Discovery:** —
- **Status:** Planned

## Demo
1. Search for matching records, select another result and verify the scan count and exclusion notice remain accurate without another search.
2. Exercise an empty result and a failed repeat search, then retry.

## Tasks
- [ ] **T39.1 Organize bounded search and result feedback** — Covers: F22-AC2
  - Files: `src/components/SearchTopicMessages.tsx`, `src/components/SearchTopicMessages.module.css` (new), `src/components/SearchTopicMessages.test.tsx`, `src/pages/TopicPage.test.tsx`
  - Do: Present the existing search bounds and outcome near the shared result workspace while retaining case sensitivity, examined/truncated reporting, validation, empty, loading and retry states. Verify selecting matches does not invoke another search.
  - Done when: `npm test -- src/components/SearchTopicMessages.test.tsx src/pages/TopicPage.test.tsx src/App.test.tsx` and `npm run build` pass.

## Review
