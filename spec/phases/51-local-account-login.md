# P51 · F27-B1 + F27-B4 — Bootstrap and local account login
- **Milestone:** M10
- **Covers:** F27-AC1 and the local-account portion of F27-AC4
- **Discovery:** —
- **Status:** Building

## Existing baseline
The Gateway already provides the tested offline bootstrap, local
authentication, session, password-change and account-administration
foundations documented in `internal/console/README.md`. These were delivered
in earlier commits; the tasks below do not retroactively claim their commits.
The role-free first SSO login in F27-AC4 remains for P53 and end-to-end
authorization verification. The existing manual deployment is not an M10
security boundary.

## Demo
1. Run the Console HTTPS server tests to verify one-use bootstrap, local
   sign-in, mandatory password replacement, disabled-account rejection and
   logout without exposing credentials.
2. Run the UI session-client and sign-in tests. With the opt-in authentication
   preview, sign in, change a temporary password, and sign out against a
   verified same-origin HTTPS fixture; the preview must not expose Kafka
   routes or fall back to the existing shared-token interface.
3. Confirm the default manual UI remains unchanged. The preview is not a
   secured deployment, and real Cognito and Gateway authorization remain
   outstanding.

## Tasks
- [x] **T51.1 Add a same-origin Console session client** — Covers: F27-AC1
  - Files: `src/console/ConsoleSession.ts` (new), `src/console/ConsoleSessionError.ts` (new), `src/console/requestConsoleSession.ts` (new), `src/console/readConsoleCsrf.ts` (new), `src/console/parseConsoleSession.ts` (new), `src/console/readConsoleSession.ts` (new), `src/console/signInLocal.ts` (new), `src/console/changeLocalPassword.ts` (new), `src/console/signOutConsole.ts` (new), and corresponding tests (new).
  - Do: Use injected browser I/O, verified same-origin HTTPS, fixed session paths, same-origin cookies, no redirects or caching, bounded request time, and the session-bound CSRF cookie for mutations. Validate responses and expose distinct authentication, throttling, service and uncertain-mutation outcomes without storing or logging credentials or retrying mutations.
  - Done when: `npm test -- src/console` and `npm run typecheck` pass, including insecure origins, malformed responses, missing CSRF, redirects, expired sessions, throttle and unknown-outcome cases.
- [ ] **T51.2 Add an isolated local sign-in preview** — Covers: F27-AC1, local F27-AC4
  - Files: `src/components/ConsoleSessionGate.tsx` (new), `src/components/ConsoleSessionGate.module.css` (new), `src/components/ConsoleSessionGate.test.tsx` (new), `src/main.tsx`, `src/main.test.tsx`.
  - Do: Add an explicitly opt-in authentication-only preview for session inspection, local sign-in, mandatory password replacement and logout. Make loading, errors, throttling and uncertain outcomes accessible and clear; clear password fields, prevent duplicate submissions, and never render the legacy Gateway shell or send Kafka requests in preview mode. Keep the default manual UI unchanged.
  - Done when: `npm test -- src/components/ConsoleSessionGate.test.tsx src/main.test.tsx src/App.test.tsx` and `npm run build` pass with and without the preview flag.
- [ ] **T51.3 Verify the preview against real HTTPS** — Covers: F27-AC1, local F27-AC4
  - Files: `src/test/consolePreviewHttps.ts` (new), `src/console/previewIntegration.test.ts` (new), Gateway `cmd/console/server_test.go`, Gateway `internal/console/README.md`, `spec/ROADMAP.md`, `spec/TECH-SPEC.md`.
  - Do: Provide a loopback-only, verified same-origin HTTPS test fixture for the built preview and existing Console API. Exercise bootstrap, restricted and normal login, password replacement, logout and denied credentials; verify no legacy Gateway request occurs. Keep the existing EKS-D manual deployment and persistent Kafka volumes untouched.
  - Done when: the real HTTPS fixture and the full Gateway and UI test suites pass; record any unavailable manual-browser or deployment checks as not run.

## Review
