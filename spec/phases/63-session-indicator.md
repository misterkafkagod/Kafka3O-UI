# P63 · F46-B1 — Compact signed-in session indicator
- **Milestone:** M11
- **Covers:** F46-AC1
- **Discovery:** —
- **Status:** Building

## Demo
1. Build the secured UI and open it through the forwarded Console origin; sign in as `admin`.
2. Expect no "Console access" card: the application header's right corner shows "Signed in as admin" and Sign out; at 320 px the header wraps without page-wide horizontal overflow.
3. Sign out and expect the sign-in card again; a session that must change its password still shows the full card.

## Tasks
- [x] **T63.1 Session indicator in the application header** — Covers: F46-AC1
  - Files: src/components/SessionIndicator.tsx (new), src/components/SessionIndicator.module.css (new), src/components/SessionIndicator.test.tsx (new), src/components/AppShell.tsx, src/components/AppShell.module.css, src/components/AppShell.test.tsx, src/App.tsx
  - Do: `SessionIndicator` renders "Signed in as <username>" and a Sign out button (pending label "Signing out...", disabled while pending) in a labeled group. `AppShell` and `App` accept an optional `sessionIndicator` node rendered at the end of the header; without it the header is unchanged (legacy and preview builds).
  - Done when: `npx vitest run src/components/SessionIndicator.test.tsx src/components/AppShell.test.tsx` passes, covering name, pending state, the click callback and the header with and without an indicator.
- [x] **T63.2 Replace the signed-in card** — Covers: F46-AC1
  - Files: src/components/ConsoleSessionGate.tsx, src/components/ConsoleSessionGate.module.css, src/components/ConsoleSessionGate.test.tsx, src/components/ConsoleSessionGate.administration.test.tsx, src/main.tsx
  - Do: For a signed-in session without a required password change, the gate renders no card. With `renderApp`, it renders only the application, passing `renderApp(sessionEnded, indicator)` the `SessionIndicator`; with no `renderApp` (authentication preview), the gate's own header shows the indicator and the preview note stays as a compact notice. An unresolved password-change warning stays visible as an alert. Signed-out, checking, unavailable, uncertain and password-change states keep the card. `securedApp` passes the indicator to `App`.
  - Done when: `npx vitest run src/components/ConsoleSessionGate` passes, covering no card after sign-in in both modes, the indicator in the header, sign-out back to the card and the password-change card; then `npm test` and `npm run build` pass.

- [x] **T63.3 Fix: administration reloads on every gate render** — Covers: F46-AC1
  - Files: src/components/ConsoleSessionGate.tsx, src/components/ConsoleSessionGate.administration.test.tsx
  - Do (plan amendment 2026-11-08, found by the opt-in preview integration test): `sessionEnded` is a stable callback, so administration sections no longer reload, and end a revoked session, whenever the gate re-renders, for example while signing out.
  - Done when: `npx vitest run src/components/ConsoleSessionGate.administration.test.tsx` passes, including no reload during sign-out, and `KAFKA3O_PREVIEW_INTEGRATION=1 npx vitest run src/console/preview` passes against the built preview.

## Review
