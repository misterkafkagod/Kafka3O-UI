# P99 · F60-B1 + F60-B2 — Sign in from the terminal
- **Milestone:** M18
- **Covers:** F60-AC1, F60-AC2
- **Discovery:** discovery/cli-console-session.md
- **Status:** Building

## Demo
1. In Kafka3O-cli: `go build -o kafka3o ./cmd/kafka3o`.
2. `./kafka3o login --console http://localhost:5173 --username admin` and type the password: prints "Signed in to http://localhost:5173 as admin until <time>"; the session file is mode 0600 and holds no password.
3. A wrong password: "Sign-in failed: wrong username or password, or the account is disabled.", exit code 3, no file.

## Tasks
- [x] **T99.1 CLI skeleton** — Covers: TECH-SPEC CLI stack and structure
  - Files: Kafka3O-cli go.mod (new), go.sum (new), .gitignore (new), README.md (new), cmd/kafka3o/main.go (new), internal/cli/new_root_command.go (new), internal/cli/new_root_command_test.go (new), internal/cli/exit_code.go (new), internal/cli/exit_code_test.go (new), internal/console/errors.go (new)
  - Do: module `github.com/misterkafkagod/Kafka3O-cli` on Go 1.27.4 with Cobra v1.10.2; `main` builds the root command, runs it and exits with `ExitCode(err)` (0 ok, 1 usage or not found, 2 a cluster failed, 3 not signed in or sign-in failed); typed console errors.
  - Done when: `go build ./... && go test ./...` passes, and `go run ./cmd/kafka3o --help` lists the root command.
- [x] **T99.2 Console sign-in, sign-out and the session file** — Covers: F60-AC1, F60-AC2
  - Files: internal/console/session.go (new), internal/console/origin_of.go (new), internal/console/origin_of_test.go (new), internal/console/sign_in.go (new), internal/console/sign_in_test.go (new), internal/console/sign_out.go (new), internal/console/sign_out_test.go (new), internal/console/save_session.go (new), internal/console/save_session_test.go (new), internal/console/session_path.go (new), internal/console/session_path_test.go (new)
  - Do: per the recipe: `SignIn` posts the credentials with `Origin`, keeps both cookies and the expiry, maps `authentication_failed`/`authentication_throttled`/other failures to typed errors, and on `mustChangePassword` signs the new session out and returns `ErrPasswordChangeRequired`; `SignOut` posts logout with cookies, `Origin` and `X-Kafka3O-CSRF`; `SaveSession` writes the file atomically with mode 0600 in a 0700 directory; `SessionPath` is `<user config dir>/kafka3o/session.json`.
  - Done when: `go test ./internal/console/` passes against an `httptest` Console covering success, wrong password, throttling, a required password change (session signed out, nothing returned), missing cookies, the file mode and that the password is not in the file.
- [ ] **T99.3 `kafka3o login`** — Covers: F60-AC1, F60-AC2
  - Files: internal/cli/new_login_command.go (new), internal/cli/new_login_command_test.go (new), internal/cli/read_password.go (new), internal/terminal/read_hidden_password.go (new), internal/cli/new_root_command.go, cmd/kafka3o/main.go
  - Do: `login --console <url> [--username u] [--password-stdin]`; asks for missing values (password hidden through `golang.org/x/term` v0.48.0 when stdin is a terminal); signs in, saves the session and prints "Signed in to <url> as <user> until <local time>"; errors print one line to stderr ("Sign-in failed: …", "Password change required: change it in the console first.", "Too many sign-in attempts; try again later."); never prints the password or cookies.
  - Done when: `go test ./internal/cli/` passes covering success with the printed line and the saved file, wrong password (exit 3, no file), password change required, `--password-stdin`, and a missing `--console`.

## Review
