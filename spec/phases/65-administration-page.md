# P65 · F46-B2 — Separate Administration page for administrators
- **Milestone:** M11
- **Covers:** UI portion of F46-AC2
- **Discovery:** —
- **Status:** Building

## Demo
1. Serve the secured build through the local Console fixture and sign in as the global ADMIN.
2. Expect an Administration link in the header that opens `/administration` with Access management, Cluster classification and Audit; no administration sections below the cluster pages; no horizontal overflow at 320 px.
3. As a user without an ADMIN grant, expect no Administration link and "Not permitted" at `/administration` with no administration requests; as a cluster ADMIN, only Audit.

## Tasks
- [x] **T65.1 Read administration capabilities from the session** — Covers: UI portion of F46-AC2
  - Files: src/console/ConsoleSession.ts, src/console/parseConsoleSession.ts, src/console/parseConsoleSession.test.ts
  - Do: `ConsoleSession` gains optional `administration: { access: boolean; audit: boolean }`, parsed only when the field is an object with two booleans; a missing field stays undefined and a malformed one is rejected as `invalid_response`.
  - Done when: `npx vitest run src/console/parseConsoleSession.test.ts` passes, covering present, missing and malformed flags.
- [x] **T65.2 Administration page and header link** — Covers: UI portion of F46-AC2
  - Files: src/components/AdministrationPage.tsx (new), src/components/AdministrationPage.module.css (new), src/components/AdministrationPage.test.tsx (new), src/components/AppShell.tsx, src/components/AppShell.test.tsx, src/App.tsx
  - Do: `AdministrationPage` shows "Checking access..." while flags are unknown, "Not permitted" when both are false (rendering no administration component, so nothing is requested), Access management and Cluster classification when `access`, and Audit when `audit`; its sections shrink to the viewport so tables scroll inside their regions. `AppShell` shows an Administration link in the primary navigation when told to; `App` adds the `/administration` route rendering the supplied page, or "Not permitted" when none is supplied.
  - Done when: `npx vitest run src/components/AdministrationPage.test.tsx src/components/AppShell.test.tsx` passes, covering global ADMIN, cluster ADMIN, no grants, unknown flags and the link.
- [x] **T65.3 Move administration out of the session gate** — Covers: UI portion of F46-AC2
  - Files: src/components/ConsoleSessionGate.tsx, src/components/ConsoleSessionGate.administration.test.tsx, src/main.tsx, src/console/previewIntegration.test.ts, src/console/previewAdministrationIntegration.test.ts
  - Do: After sign-in, when the session has no flags, the gate inspects the session once to read them (a failure leaves them unknown-as-none). With `renderApp`, the gate passes the indicator, the flags and an `AdministrationPage` element to the application and renders no sections itself; the authentication preview renders `AdministrationPage` inline below its header. `securedApp` forwards them to `App`.
  - Done when: `npx vitest run src/components/ConsoleSessionGate` passes, covering the flags reaching the application, no inline sections in the secured app and filtered sections in the preview; then `npm test`, `npm run build` and `KAFKA3O_PREVIEW_INTEGRATION=1 npx vitest run src/console/preview` (with the preview build) pass.

## Review
