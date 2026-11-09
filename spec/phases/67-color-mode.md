# P67 · F45-B1 + F45-B5 + F45-B6 — Saved color mode switch
- **Milestone:** M11
- **Covers:** F45-AC1, F45-AC4, F45-AC5, F45-AC6
- **Discovery:** —
- **Status:** Building

## Demo
1. Open the console on a light operating-system theme, open Appearance in the header and choose Dark.
2. Expect dark colors immediately, still dark after a reload without a light flash, and a second open tab switching too; Match system follows an operating-system theme change; Reset returns to Match system and removes the stored value.
3. With browser storage blocked, expect the defaults, a working console and "Preferences can't be saved in this browser" after a change.

## Tasks
- [x] **T67.1 Appearance model, storage and application** — Covers: F45-AC4, F45-AC5, F45-AC6
  - Files: src/appearance/Appearance.ts (new), src/appearance/parseAppearance.ts (new), src/appearance/parseAppearance.test.ts (new), src/appearance/loadAppearance.ts (new), src/appearance/loadAppearance.test.ts (new), src/appearance/saveAppearance.ts (new), src/appearance/saveAppearance.test.ts (new), src/appearance/applyAppearance.ts (new), src/appearance/applyAppearance.test.ts (new)
  - Do: `Appearance` holds `mode`, `theme`, `font`, `textSize` and `density` with enumerated values and defaults (system, blue, system, default, comfortable). `parseAppearance` reads the stored JSON field by field, keeping valid fields and defaulting the rest. `loadAppearance` reads `kafka3o.appearance.v1` from a storage that may be missing or throw. `saveAppearance` writes only the five fields (or removes the entry on reset) and reports whether it succeeded. `applyAppearance` sets `data-mode`, `data-theme`, `data-font`, `data-text-size` and `data-density` on the root, removing each attribute that holds its default.
  - Done when: `npx vitest run src/appearance` passes, covering valid, partial, malformed and unknown values, throwing storage, the written shape and attribute removal for defaults.
- [ ] **T67.2 Appearance store, startup application and mode tokens** — Covers: F45-AC1, F45-AC4
  - Files: src/appearance/createAppearanceStore.ts (new), src/appearance/createAppearanceStore.test.ts (new), src/appearance/AppearanceContext.ts (new), src/appearance/useAppearance.ts (new), src/main.tsx, src/styles.css
  - Do: `createAppearanceStore` keeps the current appearance, applies and saves every change, records whether the last save failed, resets to the defaults, and follows `storage` events for its key from other tabs; `useAppearance` exposes it through `AppearanceContext`. `main.tsx` loads and applies the saved appearance before the first render and provides the store. `styles.css` keeps system light/dark as the default and lets `data-mode="light"` and `data-mode="dark"` force either token set.
  - Done when: `npx vitest run src/appearance` passes, covering apply-and-save, failed saves, reset and a storage event from another tab; then `npm test` and `npm run build` pass.
- [ ] **T67.3 Appearance panel with the color mode** — Covers: F45-AC1, F45-AC5
  - Files: src/appearance/AppearancePanel.tsx (new), src/appearance/AppearancePanel.module.css (new), src/appearance/AppearancePanel.test.tsx (new), src/components/AppShell.tsx, src/components/ConsoleSessionGate.tsx
  - Do: An "Appearance" disclosure in the application header and in the session gate header holds a labeled "Color mode" radio group (Match system, Light, Dark), a Reset button and, after a failed save, "Preferences can't be saved in this browser". It renders nothing when no store is provided.
  - Done when: `npx vitest run src/appearance/AppearancePanel.test.tsx src/components/AppShell.test.tsx` passes, covering keyboard-operable radios, the immediate change, Reset and the failed-save notice; then `npm test` and `npm run build` pass.

## Review
