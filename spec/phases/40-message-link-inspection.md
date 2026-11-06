# P40 · F22-B3 — Inspect and share exact message links
- **Milestone:** M7
- **Covers:** F22-AC3
- **Discovery:** —
- **Status:** Review

## Demo
1. Copy the selected record's link with an encoded topic and a large decimal offset; reopen it and inspect only the exact record.
2. Open unavailable and unverifiable positions and verify neither displays a neighboring record or offers a misleading link.

## Tasks
- [x] **T40.1 Identify and verify linked message inspection** — Covers: F22-AC3
  - Files: `src/components/LinkedTopicMessage.tsx`, `src/components/MessageWorkspace.tsx` and `src/components/MessageInspector.tsx` (from T38.1), `src/components/MessageWorkspace.test.tsx` (from T38.1), `src/pages/TopicPage.test.tsx`, `src/App.test.tsx`
  - Do: Clearly identify a verified linked record in the shared inspector; preserve invalid, unavailable and unverifiable-position errors and exact decimal links. Verify changing the selected record does not leave a previous copy-success message or link attached to the new record.
  - Done when: `npm test -- src/components/MessageWorkspace.test.tsx src/messages/findLinkedTopicMessage.test.ts src/pages/TopicPage.test.tsx src/App.test.tsx` and `npm run build` pass.

## Review
