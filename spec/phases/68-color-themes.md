# P68 · F45-B2 — Preset color themes
- **Milestone:** M11
- **Covers:** F45-AC2
- **Discovery:** —
- **Status:** Done

## Demo
1. Open Appearance and switch between Blue, Slate, Teal and High contrast, in Light and in Dark.
2. Expect the whole console to recolor each time, status labels to keep their text, and `npx vitest run src/appearance/themeContrast.test.ts` to pass for every theme and mode.

## Tasks
- [x] **T68.1 Contrast ratio** — Covers: F45-AC2
  - Files: src/appearance/contrastRatio.ts (new), src/appearance/contrastRatio.test.ts (new)
  - Do: `contrastRatio` computes the WCAG 2.x contrast ratio of two `#rrggbb` colors and rejects other formats.
  - Done when: `npx vitest run src/appearance/contrastRatio.test.ts` passes, covering black/white (21:1), identical colors (1:1), a known mid pair and invalid input.
- [x] **T68.2 Theme tokens with a contrast test** — Covers: F45-AC2
  - Files: src/appearance/themes.css (new), src/appearance/themeContrast.test.ts (new), src/main.tsx
  - Do: `themes.css`, imported after `styles.css`, defines Slate, Teal and High contrast as full light and dark sets of the existing `--color-*` tokens, selected by `data-theme` with the same light, dark and system-dark rules as P67 (Blue stays in `styles.css`). The test reads both stylesheets and checks, for every theme and mode, that all tokens are defined, the system-dark block equals the forced dark block, normal-text pairs (text, muted text and links on canvas and surfaces, button text on primary, alert text on its surface, success status on surfaces) reach 4.5:1 (7:1 for High contrast), and borders, focus and primary against canvas and surfaces reach 3:1.
  - Done when: `npx vitest run src/appearance/themeContrast.test.ts` passes for all eight theme/mode combinations; then `npm run build` passes.
- [x] **T68.3 Color theme choice** — Covers: F45-AC2
  - Files: src/appearance/AppearancePanel.tsx, src/appearance/AppearancePanel.test.tsx
  - Do: The Appearance panel adds a labeled "Color theme" radio group (Blue, Slate, Teal, High contrast) that applies immediately and is saved like the color mode.
  - Done when: `npx vitest run src/appearance/AppearancePanel.test.tsx` passes, covering the theme change and Reset; then `npm test` passes.

## Review
- **Demo:** passed (auto-approved under the user's standing M11 instruction, 2026-11-08; run by Claude). `themeContrast.test.ts` passes 12/12 (four themes, light and dark, full token sets, system dark equal to forced dark), and a deliberately weakened token made it fail (2.33:1) before being restored. In Chromium 1194 against the built UI, switching Blue, Slate, Teal and High contrast in Light and Dark recolored the console to each theme's canvas, 8/8, with the "Gateway unreachable" status keeping its text; Teal light and High contrast dark were checked visually.
- **Vulnerability scan:** not run; no dependency changes.
- **Regression:** `npm test` 488 passed (5 opt-in skipped); default build.
- **Convention check:** `contrastRatio` and `AppearanceChoice` are single-function files with tests; `themes.css` is data.
- **Note:** lowest ratios: normal text 5.40:1 (Slate light, success status on subtle surface), High contrast 7.93:1; boundaries 4.26:1 (Teal light border on canvas).

