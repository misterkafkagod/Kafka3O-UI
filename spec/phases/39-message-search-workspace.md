# P39 · F22-B2 — Inspect bounded message search results
- **Milestone:** M7
- **Covers:** F22-AC2
- **Discovery:** —
- **Status:** Done

## Demo
1. Search for matching records, select another result and verify the scan count and exclusion notice remain accurate without another search.
2. Exercise an empty result and a failed repeat search, then retry.

## Tasks
- [x] **T39.1 Organize bounded search and result feedback** — Covers: F22-AC2
  - Files: `src/components/SearchTopicMessages.tsx`, `src/components/SearchTopicMessages.module.css` (new), `src/components/SearchTopicMessages.test.tsx`, `src/pages/TopicPage.test.tsx`
  - Do: Present the existing search bounds and outcome near the shared result workspace while retaining case sensitivity, examined/truncated reporting, validation, empty, loading and retry states. Verify selecting matches does not invoke another search.
  - Done when: `npm test -- src/components/SearchTopicMessages.test.tsx src/pages/TopicPage.test.tsx src/App.test.tsx` and `npm run build` pass.

## Review
- **Demo:** Browser fixtures showed the examined count and excluded-offset notice alongside two matches. Keyboard selection updated the inspector without a second search. A failed repeat search hid stale results, and retry showed the accurate empty, non-truncated outcome.
- **Responsive:** The search controls, summary and workspace had no page-wide overflow at 320, 768 or 1440 CSS pixels.
- **Validation:** All 316 UI tests and the production build passed on Node 24.21.0. The M7 deployment remains deferred until the milestone's final phase.
- **Vulnerability scan:** Not run; P39 adds no dependencies and is not the final M7 phase.
- **Notes:** The search input describes the existing case-sensitive, bounded scan to assistive technology.
