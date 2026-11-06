# P31 · F19-B2 — Keep pages usable across viewports and input modes
- **Milestone:** M6
- **Covers:** F19-AC2
- **Discovery:** —
- **Status:** Review

## Demo
1. On the updated manual-test UI, check 320, 768 and 1440 CSS-pixel viewport widths and a separate 200% zoom check; confirm there is no page-wide horizontal overflow and wide tables scroll in labeled regions.
2. Navigate using only the keyboard; verify the skip link, logical focus order and visible focus. Emulate reduced motion and confirm nonessential motion is removed.

## Tasks
- [x] **T31.1 Add an accessible scroll region for wide tables** — Covers: F19-AC2
  - Files: `src/components/ScrollableTableRegion.tsx` (new), `src/components/ScrollableTableRegion.module.css` (new), `src/components/ScrollableTableRegion.test.tsx` (new)
  - Do: Create one reusable, labeled and keyboard-focusable region that contains horizontal overflow without changing table semantics.
  - Done when: `npm test -- src/components/ScrollableTableRegion.test.tsx` passes, confirming the region's accessible name and contained table.
- [x] **T31.2 Contain overflow for every existing data table** — Covers: F19-AC2
  - Files: `src/components/BrokerTable.tsx`, `src/components/TopicTable.tsx`, `src/components/MessageTable.tsx`, `src/components/ConsumerGroupDetails.tsx`, `src/pages/TopicDetailPage.tsx`, and their existing tests
  - Do: Wrap each broker, topic, message, consumer-group and topic-detail table in the shared region; verify the consumer-group tables retain their accessible names and content.
  - Done when: `npm test -- src/components/ScrollableTableRegion.test.tsx src/components/BrokerTable.test.tsx src/components/TopicTable.test.tsx src/components/MessageTable.test.tsx src/components/ConsumerGroupDetails.test.tsx src/pages/TopicDetailPage.test.tsx` passes and `npm run build` passes.
- [x] **T31.3 Add responsive shell, skip navigation and keyboard focus support** — Covers: F19-AC2
  - Files: `src/components/AppShell.tsx` (from T28.1), `src/components/AppShell.module.css` (from T30.2), `src/styles.css` (from T30.1), `src/App.test.tsx`
  - Do: Add a skip link and focus target, preserve natural reading/tab order, adapt shell and page layout at narrow widths, show visible focus, and honor reduced-motion preferences.
  - Done when: `npm test -- src/App.test.tsx` and `npm run build` pass; browser checks confirm no page-wide overflow at all specified widths and zoom, keyboard operation and reduced-motion behavior.

## Review
