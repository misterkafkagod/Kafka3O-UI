# P123 · F68-B3 — Local accounts
- **Milestone:** M22
- **Covers:** F68-AC3
- **Discovery:** —
- **Status:** Building

## Demo
1. `kafka3o account create kafka3o-cli-test --password-stdin` (a random temporary password generated locally, never shown or stored in git) asks and prints "Created local account kafka3o-cli-test; it must change its password at first sign-in."; `kafka3o accounts` lists it as enabled with a password to change.
2. `account reset-password`, `account disable` and `account enable` on it are confirmed and seen in `accounts`; a short password, an invalid username and a duplicate username are refused; `account disable admin` is not tried (real account).

## Tasks
- [x] **T123.1 Local account actions** — Covers: F68-AC3
  - Files: Kafka3O-cli internal/accounts/account.go (new), internal/accounts/validate_username.go (new), internal/accounts/validate_username_test.go (new), internal/accounts/validate_temporary_password.go (new), internal/accounts/validate_temporary_password_test.go (new), internal/accounts/list_accounts.go (new), internal/accounts/list_accounts_test.go (new), internal/accounts/find_account.go (new), internal/accounts/find_account_test.go (new), internal/accounts/create_account.go (new), internal/accounts/reset_password.go (new), internal/accounts/set_account_enabled.go (new), internal/accounts/change_account_test.go (new), internal/accounts/fake_console_test.go (new)
  - Do: `ValidateUsername` mirrors the Console (1–64 letters, digits and, after the first, `.`, `_`, `-`; compared case-insensitively); `ValidateTemporaryPassword` needs at least 12 characters and at most 1024 bytes. `ListAccounts` follows `nextCursor` (`limit=100`); `FindAccount` resolves a username to its account (not found otherwise). `CreateAccount` posts `{username, temporaryPassword}`, `ResetPassword` posts `{temporaryPassword}` to `…/{id}/password-reset`, `SetAccountEnabled` puts `{enabled}` to `…/{id}/enabled`; each requires the Console's answer (the created username, the enabled echo) or reports "may have been applied".
  - Done when: `go test ./internal/accounts/` passes covering the username and password rules, paging, not found, the three request bodies and paths, and a wrong echo.
- [ ] **T123.2 `kafka3o accounts` and `kafka3o account …`** — Covers: F68-AC3
  - Files: internal/cli/new_accounts_command.go (new), internal/cli/new_accounts_command_test.go (new), internal/cli/new_account_command.go (new), internal/cli/new_account_command_test.go (new), internal/cli/confirm_change.go (new), internal/cli/confirm_change_test.go (new), internal/cli/read_new_password.go (new), internal/cli/read_new_password_test.go (new), cmd/kafka3o/main.go
  - Do: `accounts` prints `USERNAME ENABLED PASSWORD ID` (`must change` / `set`) or JSON. `account create <username>`, `account reset-password <username>` read the temporary password hidden twice (must match) or from the first line of standard input with `--password-stdin`, check it, then confirm; `account enable|disable <username>` confirm. `ConfirmChange` is `PrepareChange` without a cluster ("Change:" lines, "Proceed? [y/N]", `--yes`). Results: created, reset (the account must change it at next sign-in; its sessions end), enabled or disabled. Refusals go through `adminError`.
  - Done when: `go test ./internal/cli/ -run 'AccountsCommand|AccountCommand|ConfirmChange|ReadNewPassword'` passes covering the table, create with stdin and with the hidden prompt, mismatched and short passwords, reset, enable/disable, cancel, a duplicate username, not found and exit 4.

## Review
