# P38 · F22-B1 — Select and inspect message read results
- **Milestone:** M7
- **Covers:** F22-AC1
- **Discovery:** —
- **Status:** Done

## Demo
1. Read multiple records, select each using mouse and keyboard, and inspect its exact position, timestamp, key, value and headers in text, JSON and base64.
2. Change the read result set and verify the inspector cannot retain a stale or wrongly identified record; check the workspace at 320 and 1440 CSS pixels.

## Tasks
- [x] **T38.1 Replace expanded message rows with a selectable workspace** — Covers: F22-AC1
  - Files: `src/components/MessageWorkspace.tsx` (new), `src/components/MessageResultList.tsx` (new), `src/components/MessageInspector.tsx` (new), `src/components/MessageWorkspace.module.css` (new), `src/components/MessageTable.tsx` (remove), their tests, `src/components/LinkedTopicMessage.tsx`, `src/components/SearchTopicMessages.tsx`, `src/pages/TopicMessagesPage.tsx`, and affected page/search tests
  - Do: Show a compact result list and initially selected record, with keyboard-operable selection and a responsive inspector. Reuse existing formatting, exact-offset and copy-link helpers; retain null/empty values, headers, format choices and error handling. Selection must remain valid when results change, including unsafe legacy offsets, and selection must not issue another read or search.
  - Done when: `npm test -- src/components/MessageWorkspace.test.tsx src/components/SearchTopicMessages.test.tsx src/pages/TopicPage.test.tsx src/App.test.tsx` and `npm run build` pass.
- [x] **T38.2 Organize message read controls** — Covers: F22-AC1
  - Files: `src/pages/TopicMessagesPage.tsx`, `src/pages/TopicMessagesPage.module.css` (new), `src/pages/TopicPage.test.tsx`
  - Do: Group the existing positioned-read, latest, search and produce entry points around the workspace without changing request semantics or write safeguards; encode gateway IDs in the back link.
  - Done when: `npm test -- src/components/ReadTopicMessagesForm.test.tsx src/pages/TopicPage.test.tsx src/App.test.tsx` and `npm run build` pass.
- [x] **T38.3 Fix: Keep read controls compact and radio labels adjacent** — Covers: F22-AC1
  - Files: `src/pages/TopicMessagesPage.module.css`
  - Do: Align each offset/timestamp radio with its label and arrange the existing read fields compactly on wider screens while stacking them on narrow screens. Keep the same form fields, submission behavior and keyboard order.
  - Done when: `npm test -- src/components/ReadTopicMessagesForm.test.tsx src/pages/TopicPage.test.tsx` and `npm run build` pass; browser checks at 320, 768 and 1440 CSS pixels show adjacent radio labels and no page-wide overflow.

## Review
- **Demo:** Browser fixtures verified keyboard and mouse selection, exact large offsets, text/JSON/base64 values and headers. Changing results reset the selection, and selecting a record issued no additional message read.
- **Responsive:** The workspace and read controls had no page-wide overflow at 320, 768 or 1440 CSS pixels. Both radio choices remained keyboard-operable and their labels were adjacent.
- **Validation:** All 316 UI tests and the production build passed on Node 24.21.0. The M7 deployment remains deferred until the milestone's final phase.
- **Vulnerability scan:** Not run; P38 adds no dependencies and is not the final M7 phase.
- **Notes:** Selecting a record is local to the current result set; unavailable exact offsets cannot create a misleading link.
