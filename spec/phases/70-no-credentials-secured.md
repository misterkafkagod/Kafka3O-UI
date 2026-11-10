# P70 · F47-B1 — No Gateway credentials in the secured console
- **Milestone:** M12
- **Covers:** F47-AC1
- **Discovery:** —
- **Status:** Done

## Demo
1. Serve the secured build through the local Console fixture and sign in.
2. Expect no Gateway credentials control in the header and no "Manage credentials" action on any card or error; the legacy build still shows the control.

## Tasks
- [x] **T70.1 Hide credential controls in the secured build** — Covers: F47-AC1
  - Files: src/components/GatewayConnectionContext.ts, src/components/GatewayCredentialAction.tsx, src/components/GatewayCredentialAction.test.tsx, src/components/AppShell.tsx, src/components/AppShell.test.tsx, src/App.tsx, src/main.tsx
  - Do: `AppShell` and `App` accept `credentialsControl: false` for the secured build; then the shell renders no credentials panel and provides a `null` connection action, and `GatewayCredentialAction` renders nothing for `null` (a missing provider still throws, as today). `securedApp` passes it; the legacy and preview builds are unchanged.
  - Done when: `npx vitest run src/components/AppShell.test.tsx src/components/GatewayCredentialAction.test.tsx` passes, covering both builds; then `npm test` and `npm run build` pass.

## Review
- **Demo:** passed (auto-approved under the user's standing M12 instruction, 2026-11-09; run by Claude). The secured build served by the local Console fixture with two registered clusters, in Chromium 1194, 3/3: both cluster cards render, the header has no Gateway credentials control, and no "Manage credentials" action appears even though both synthetic clusters fail. The legacy build keeps the control (unit test, and the legacy screenshots from P67–P69).
- **Vulnerability scan:** not run; no dependency changes.
- **Regression:** `npm test` 496 passed (5 opt-in skipped); default and secured builds.
- **Convention check:** no new files; `GatewayCredentialAction` distinguishes a `null` provider (no credentials) from a missing one.

