# P52 · F27-B3 + F29-B3 — Session expiration, logout and revocation
- **Milestone:** M10
- **Covers:** The local Console-session portions of F27-AC3 and F29-AC4, and the revocation-audit portion of F27-AC4
- **Discovery:** —
- **Status:** Building

## Existing baseline and boundaries
P51's loopback Console already issues opaque local sessions, checks idle and
absolute expiry, logs out, and revokes sessions on account disablement or
password replacement. This phase adds narrowly scoped local global-ADMIN
session controls and verifies the preview's response to a revoked session.
The authentication-only preview contains no Kafka data or query cache.

Gateway-side revocation, protected Kafka routes, secured-UI cache clearing and
no-replay verification require P55/P59; Cognito sign-out requires P53. They
remain open even if the local portion of this phase is completed. This phase
does not deploy the preview or alter the existing manual access path.

## Demo
1. List active local sessions as a current local global ADMIN, with bounded
   pages and no token, CSRF, password or credential-version material.
2. Revoke one other session and the administrator's current session; verify
   the next Console request is rejected, unrelated sessions remain active,
   decisions are audited and non-admins cannot manage sessions.
3. Exercise the preview's expired/revoked-session handling without replay,
   then verify the default UI and persistent Kafka deployment remain intact.

## Tasks
- [x] **T52.1 Add audited single-session revocation** — Covers: local F27-AC3, F27-AC4, F29-AC4
  - Files: Gateway `internal/console/identity/account.go`, `internal/console/identity/validate_session_id.go` (new), `internal/console/identity/revoke_admin_session.go` (new), `internal/console/identity/revoke_admin_session_test.go` (new), `internal/console/storage/revoke_admin_session.go` (new), `internal/console/storage/revoke_admin_session_test.go` (new), Gateway `internal/console/README.md`, `spec/ROADMAP.md`, `spec/TECH-SPEC.md`.
  - Do: Give a current unrestricted local global ADMIN an individually targeted, audited session revocation. Recheck the actor's current session and grant after obtaining the SQLite transaction; atomically commit the target revocation and redacted outcome. Handle invalid, missing, expired, already-revoked and self-targeted sessions explicitly, and report audit failure or an uncertain transaction without automatic retry. Never expose or log token or CSRF material.
  - Done when: `go test ./internal/console/identity ./internal/console/storage -run 'Test.*AdminSession|Test.*SessionID'` passes, covering success, self-revocation, unrelated sessions, denial, queued expiry, redaction, audit failure and uncertain outcomes.
- [x] **T52.2 Add bounded active-session listing** — Covers: local F27-AC3, F29-AC4
  - Files: Gateway `internal/console/identity/account.go`, `internal/console/identity/list_admin_sessions.go` (new), `internal/console/identity/list_admin_sessions_test.go` (new), `internal/console/storage/list_admin_sessions.go` (new), `internal/console/storage/list_admin_sessions_test.go` (new), Gateway `internal/console/README.md`, `spec/ROADMAP.md`, `spec/TECH-SPEC.md`.
  - Do: List only active local sessions for a current unrestricted local global ADMIN, ordered by opaque session ID with a default 50 and maximum 100 items per page. Return account identity, creation and expiration timestamps and whether it is the caller's session, never credentials or their digests. Recheck authorization and commit redacted listing audit in the same transaction; return no data if auditing fails. Pagination is not a snapshot.
  - Done when: `go test ./internal/console/identity ./internal/console/storage -run 'Test.*AdminSession'` passes, covering pagination, expiration, denial, authorization changes, redaction and audit failures.
- [x] **T52.3 Expose Console session controls over HTTPS** — Covers: local F27-AC3, F27-AC4, F29-AC4
  - Files: Gateway `internal/console/httpapi/session_api.go`, `internal/console/httpapi/new_session_api.go`, `internal/console/httpapi/list_admin_sessions.go` (new), `internal/console/httpapi/read_admin_session_list_query.go` (new), `internal/console/httpapi/revoke_admin_session.go` (new), corresponding HTTP and storage integration tests, Gateway `cmd/console/new_session_handler.go`, `cmd/console/server_test.go`, Gateway `internal/console/README.md`.
  - Do: Mount authenticated `GET /api/admin/sessions` and CSRF/Origin-protected `POST /api/admin/sessions/{sessionID}/revoke` on the existing loopback HTTPS API. Derive the actor from the session, use bounded validated input and no-store responses, map authorization, validation, audit and uncertain outcomes distinctly, and clear cookies on confirmed or uncertain self-revocation. Wire real services and update constructor tests without adding any Kafka route.
  - Done when: `go test ./internal/console/httpapi ./internal/console/storage ./cmd/console` passes, including TLS, global-versus-cluster ADMIN, malformed input, CSRF, self-revocation and next-request denial.
- [ ] **T52.4 Verify revoked-session UI handling** — Covers: local F27-AC3, F29-AC4
  - Files: `src/components/ConsoleSessionGate.test.tsx`, `src/console/previewIntegration.test.ts`, and any tightly coupled fixture or UI files required by the test.
  - Do: Verify that the authentication-only preview discards signed-in state after the real Console rejects a revoked session and never replays a mutation or falls back to the legacy Gateway. Preserve the existing manual UI. Document any native-browser, deployment, secured-cache and Gateway checks not run.
  - Done when: the opt-in built-preview HTTPS integration, `npm test`, `npm run build`, and `go test ./...` pass; no persistent Kafka data or existing deployment is changed.

## Review
