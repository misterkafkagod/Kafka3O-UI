# P30 · F19-B1 — Apply a shared visual language and system theme
- **Milestone:** M6
- **Covers:** F19-AC1
- **Discovery:** —
- **Status:** Planned

## Demo
1. Open the updated manual-test UI in system light mode and system dark mode; inspect the cluster overview, a topic table, and the message view.
2. Measure normal text contrast (at least 4.5:1), large text contrast (at least 3:1), and essential control-boundary/focus contrast (at least 3:1). Confirm controls retain accessible names and status indicators include text.

## Tasks
- [ ] **T30.1 Add system theme tokens and global baseline** — Covers: F19-AC1
  - Files: `src/styles.css` (new), `src/main.tsx`
  - Do: Define light/dark theme tokens, system preference selection, typography and baseline normalization without adding theme persistence or a styling dependency.
  - Done when: `npm run build` passes and the built app follows both system color-scheme preferences.
- [ ] **T30.2 Style the shared shell and page primitives** — Covers: F19-AC1
  - Files: `src/components/AppShell.module.css` (new), `src/components/AppShell.tsx` (from T28.1)
  - Do: Apply token-based, shell-scoped CSS Module styles for page surfaces, headings, tables, forms, actions and status indicators across existing routes; retain accessible names and text labels, with visible focus boundaries.
  - Done when: `npm test -- src/App.test.tsx` and `npm run build` pass; browser contrast measurements meet all three thresholds in both themes.

## Review
