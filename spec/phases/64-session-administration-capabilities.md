# P64 · F46-B2 — Console reports session administration capabilities
- **Milestone:** M11
- **Covers:** server portion of F46-AC2
- **Discovery:** —
- **Status:** Building

## Demo
1. Run `go test ./internal/console/httpapi -run SessionAdministration -v` in the Gateway repository.
2. Expect `GET /api/session` to report `administration: {access: true, audit: true}` for a local global ADMIN, `{access: false, audit: true}` for a cluster ADMIN, both false for an OPERATOR, a role-free user and a session that must change its password, and the flags to follow a grant change on the next request.

## Tasks
- [ ] **T64.1 Session administration capabilities** — Covers: server portion of F46-AC2
  - Files: Gateway internal/console/httpapi/resolve_session_administration.go (new), internal/console/httpapi/get_session.go, internal/console/httpapi/session_api.go, internal/console/httpapi/session_administration_test.go (new)
  - Do: `GET /api/session` adds `administration: {access, audit}` resolved from the session's current grants on every request through the existing `resolveClusterGrants` path. `access` is true only for a local (non-Cognito) session with a global ADMIN grant when access administration is mounted; `audit` is true when audit investigation is mounted and the session is a global ADMIN or ADMIN of any active registered cluster. A session that must change its password, or a Console without forwarding grants, reports both false. An invalid session during resolution returns 401 with cleared cookies; any other resolution failure reports both false and logs the error type only. Sign-in responses are unchanged; the UI reads the flags from `GET /api/session`.
  - Done when: `go test ./internal/console/httpapi -run SessionAdministration` passes for global ADMIN, cluster ADMIN, OPERATOR, role-free, must-change-password and grant revocation; then `go test ./...` passes.

## Review
