# P45 · F24-B3 — Request topic deletion with explicit consequences
- **Milestone:** M8
- **Covers:** F24-AC3
- **Discovery:** —
- **Status:** Review

## Demo
1. Inspect the topic and data-loss warning, then cancel confirmation and verify no request is sent.
2. Confirm through a synthetic fixture and distinguish accepted asynchronous deletion from uncertain failure.

## Tasks
- [x] **T45.1 Clarify the destructive topic action** — Covers: F24-AC3
  - Files: `src/components/DeleteTopic.tsx`, `src/components/DeleteTopic.module.css` (new), `src/components/DeleteTopic.test.tsx`, `src/pages/TopicDetailPage.test.tsx`
  - Do: Make the topic and deletion consequences explicit without changing the existing confirmation. Preserve fail-closed cancellation, pending and accepted guards, cache invalidation, authentication recovery and uncertain outcomes.
  - Done when: `npm test -- src/components/DeleteTopic.test.tsx src/pages/TopicDetailPage.test.tsx src/App.test.tsx` and `npm run build` pass.

## Review
