# P70 · F47-B1 — No Gateway credentials in the secured console
- **Milestone:** M12
- **Covers:** F47-AC1
- **Discovery:** —
- **Status:** Building

## Demo
1. Serve the secured build through the local Console fixture and sign in.
2. Expect no Gateway credentials control in the header and no "Manage credentials" action on any card or error; the legacy build still shows the control.

## Tasks
- [ ] **T70.1 Hide credential controls in the secured build** — Covers: F47-AC1
  - Files: src/components/GatewayConnectionContext.ts, src/components/GatewayCredentialAction.tsx, src/components/GatewayCredentialAction.test.tsx, src/components/AppShell.tsx, src/components/AppShell.test.tsx, src/App.tsx, src/main.tsx
  - Do: `AppShell` and `App` accept `gatewayCredentials: false` for the secured build; then the shell renders no credentials panel and provides a `null` connection action, and `GatewayCredentialAction` renders nothing for `null` (a missing provider still throws, as today). `securedApp` passes it; the legacy and preview builds are unchanged.
  - Done when: `npx vitest run src/components/AppShell.test.tsx src/components/GatewayCredentialAction.test.tsx` passes, covering both builds; then `npm test` and `npm run build` pass.

## Review
