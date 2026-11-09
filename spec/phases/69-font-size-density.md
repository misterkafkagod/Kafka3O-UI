# P69 · F45-B3 + F45-B4 — Font, text size and density
- **Milestone:** M11
- **Covers:** F45-AC3
- **Discovery:** —
- **Status:** Building

## Demo
1. Open Appearance, choose Hyperlegible and Extra large, and view a cluster's topics at 320, 768 and 1440 px.
2. Expect the bundled font in use, all text larger, and no page-wide horizontal overflow at any width.
3. Choose Compact and expect tighter table rows and cards while every button, link tab and radio stays at least 24×24 px.

## Tasks
- [x] **T69.1 Font and text size** — Covers: F45-AC3
  - Files: src/appearance/fonts/atkinson-hyperlegible-latin-400-normal.woff2 (new), src/appearance/fonts/atkinson-hyperlegible-latin-700-normal.woff2 (new), src/appearance/fonts/OFL.txt (new), src/appearance/typography.css (new), src/appearance/typography.test.ts (new), src/main.tsx, src/appearance/AppearancePanel.tsx, src/appearance/AppearancePanel.test.tsx
  - Do: Bundle Atkinson Hyperlegible 400 and 700 (latin, from `@fontsource/atkinson-hyperlegible` 5.3.0, SIL OFL 1.1, license kept beside the files) with `@font-face` and `font-display: swap`, served from the UI origin. `data-font="hyperlegible"` puts it before the system stack and `data-font="serif"` uses a system serif stack. `data-text-size` sets the root font size to 87.5%, 112.5% or 125%. The panel adds "Font" (System, Hyperlegible, Serif) and "Text size" (Small, Default, Large, Extra large) groups.
  - Done when: `npx vitest run src/appearance/typography.test.ts src/appearance/AppearancePanel.test.tsx` passes, covering same-origin font URLs, each font and size rule, and the new groups; then `npm test` and `npm run build` pass.
- [x] **T69.2 Compact density** — Covers: F45-AC3
  - Files: src/styles.css, src/components/AppShell.module.css, src/components/AccessManagement.module.css, src/components/ClusterOverview.module.css, src/appearance/AppearancePanel.tsx, src/appearance/AppearancePanel.test.tsx
  - Do: A `--density` factor (1 by default, 0.55 for `data-density="compact"`) scales table cell padding, the main panel, cards and the cross-cluster search panel, leaving control sizes unchanged. The panel adds a "Density" group (Comfortable, Compact).
  - Done when: `npx vitest run src/appearance/AppearancePanel.test.tsx` passes, covering the density group; `npm test` and `npm run build` pass; and Chromium measures tighter rows with every interactive target at least 24×24 px when compact.

## Review
