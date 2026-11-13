# P126 · F68-B6 — Sessions
- **Milestone:** M22
- **Covers:** F68-AC6
- **Discovery:** —
- **Status:** Building

## Demo
1. A second CLI home signs in as admin; `kafka3o sessions` lists both sessions (user, source, created, idle and absolute expiry) with the current one marked.
2. `kafka3o session revoke <second id>` asks, revokes, and the second CLI's next `whoami` reads "Signed out. Run kafka3o login." (exit 3); revoking the current session is refused locally; an unknown id reads not found.

## Tasks
- [x] **T126.1 Session listing and revocation** — Covers: F68-AC6
  - Files: Kafka3O-cli internal/sessions/admin_session.go (new), internal/sessions/list_sessions.go (new), internal/sessions/list_sessions_test.go (new), internal/sessions/revoke_session.go (new), internal/sessions/revoke_session_test.go (new), internal/sessions/fake_console_test.go (new)
  - Do: `ListSessions` follows `nextCursor` (`limit=100`) over `/api/admin/sessions`; `RevokeSession` posts (no body) to `/api/admin/sessions/{id}/revoke` and requires the operation id.
  - Done when: `go test ./internal/sessions/` passes covering paging, the path and a missing answer.
- [x] **T126.2 `kafka3o sessions` and `session revoke`** — Covers: F68-AC6
  - Files: internal/cli/new_sessions_command.go (new), internal/cli/new_sessions_command_test.go (new), internal/cli/new_session_command.go (new), internal/cli/new_session_command_test.go (new), cmd/kafka3o/main.go
  - Do: `sessions` prints `USER SOURCE CREATED IDLE EXPIRES EXPIRES CURRENT ID` (local times) or JSON. `session revoke <id>` reads the listing first: an unknown id is not found, the current session is refused ("This is your current session; use kafka3o logout."), otherwise it confirms (user, source, created) and revokes, printing "Revoked; that session must sign in again."; refusals go through `adminError`.
  - Done when: `go test ./internal/cli/ -run 'SessionsCommand|SessionCommand'` passes covering the table, a revocation, the current session, an unknown id, cancel and exit 4.

## Review
