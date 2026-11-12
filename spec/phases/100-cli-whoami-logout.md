# P100 · F60-B3 + F60-B4 — whoami, logout and an expired session
- **Milestone:** M18
- **Covers:** F60-AC3, F60-AC4
- **Discovery:** discovery/cli-console-session.md
- **Status:** Building

## Demo
1. After `kafka3o login`, `kafka3o whoami` prints the account, the console, the session expiry and, per cluster, the environment and role (Kafka A NON_PRODUCTION ADMIN, Kafka B PRODUCTION ADMIN).
2. Copy the session file, run `kafka3o logout` ("Signed out."), put the copy back and run `kafka3o whoami`: "signed out; run kafka3o login", exit 3, and the file is removed.

## Tasks
- [x] **T100.1 Load the session and call the Console** — Covers: F60-AC4
  - Files: Kafka3O-cli internal/console/load_session.go (new), internal/console/load_session_test.go (new), internal/console/delete_session.go (new), internal/console/delete_session_test.go (new), internal/console/get_json.go (new), internal/console/get_json_test.go (new)
  - Do: `LoadSession` reads the file (missing, unreadable or expired by `expiresAt` → `ErrSignedOut`); `DeleteSession` removes it (missing is fine); `GetJSON` sends a GET with the session cookies to a Console path and decodes the JSON answer; 401 → `ErrSignedOut`; other failures → `ErrConsoleUnavailable` with the status and problem code.
  - Done when: `go test ./internal/console/ -run 'LoadSession|DeleteSession|GetJSON'` passes covering a valid, missing, corrupt and expired file, a 401, a 403 problem and a decode error.
- [ ] **T100.2 `kafka3o whoami` and `kafka3o logout`** — Covers: F60-AC3, F60-AC4
  - Files: internal/cli/new_whoami_command.go (new), internal/cli/new_whoami_command_test.go (new), internal/cli/new_logout_command.go (new), internal/cli/new_logout_command_test.go (new), internal/cli/require_session.go (new), internal/cli/require_session_test.go (new), cmd/kafka3o/main.go
  - Do: `RequireSession` loads the session and, when the Console says it is over (`ErrSignedOut`), deletes the file; `whoami` shows the account, console, expiry and each cluster's environment and role from `GET /api/session` and `GET /api/clusters` (`--output json` supported); `logout` signs out and deletes the file, also when the Console says the session already ended.
  - Done when: `go test ./internal/cli/ -run 'Whoami|Logout|RequireSession'` passes covering the table and JSON output, a signed-out session (exit 3, file deleted), logout of a live and of an ended session, and not being signed in.

## Review
