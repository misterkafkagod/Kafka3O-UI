# P29 · F18-B2 — Restore direct routes and browser history
- **Milestone:** M6
- **Covers:** F18-AC2
- **Discovery:** —
- **Status:** Planned

## Demo
1. Open a direct exact-message URL for an encoded topic and verify the exact partition and offset.
2. In the updated manual-test UI, navigate between a topic view and its cluster section, then use browser Back and Forward; verify the route, breadcrumb and active section follow history.

## Tasks
- [ ] **T29.1 Verify encoded direct routes and history restoration** — Covers: F18-AC2
  - Files: `src/App.test.tsx`
  - Do: Extend App integration tests to start from an encoded cluster/topic exact-message URL, navigate between existing views, then traverse Back and Forward and assert the rendered page, shell context, and exact partition/offset request. Preserve the existing URL contract; fix only regressions the test exposes.
  - Done when: `npm test -- src/App.test.tsx` passes direct-route, encoded-name, exact-position and Back/Forward assertions, and `npm run build` passes.

## Review
