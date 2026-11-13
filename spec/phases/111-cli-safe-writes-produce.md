# P111 · F66-B1 + F66-B2 — Safe writes and producing a message
- **Milestone:** M20
- **Covers:** F66-AC1, F66-AC2
- **Discovery:** discovery/cli-console-session.md
- **Status:** Building

## Demo
1. `kafka3o produce kafka-a kafka3o-m10-verify --value "hello from the cli" --key cli --header source=cli --header run=p111` shows the change, asks "Proceed? [y/N]", and after "y" prints "Written to partition N at offset O."; `kafka3o messages` shows it with both headers in order.
2. Answering "n" prints "Canceled; nothing was sent." (exit 1).
3. On Kafka B (Production) with `--yes` but no `--reason`, the change is refused before anything is sent; an empty reason at the prompt sends nothing.

## Tasks
- [ ] **T111.1 Write requests through the Console** — Covers: F66-AC1
  - Files: Kafka3O-cli internal/console/errors.go, internal/console/send_json.go (new), internal/console/send_json_test.go (new), internal/cli/exit_code.go, internal/cli/exit_code_test.go
  - Do: `SendJSON` sends POST/DELETE with the session cookies, `Origin`, `X-Kafka3O-CSRF`, a JSON body when given and `X-Kafka3O-Change-Reason` when a reason is given; 401 → `ErrSignedOut`; `gateway_outcome_unknown`, `outcome_unknown` and `connect_action_unknown` → `ErrOutcomeUnknown` (exit 4); other failures → `Problem`.
  - Done when: `go test ./internal/console/ ./internal/cli/ -run 'SendJSON|ExitCode'` passes against a fake Console that checks the headers, covering success, a reason, no reason, 401, an unknown outcome and a 403 problem.
- [ ] **T111.2 Confirmation and Production reasons** — Covers: F66-AC1
  - Files: internal/cli/prepare_change.go (new), internal/cli/prepare_change_test.go (new), internal/cli/write_error.go (new), internal/cli/write_error_test.go (new)
  - Do: `PrepareChange` finds the cluster (unknown → exit 1), prints the change, asks for a reason on Production (from `--reason` or a prompt; blank or closed input → `ErrCanceled`; `--yes` without `--reason` → refused), then "Proceed? [y/N]" unless `--yes`; `writeError` maps a refused change: 403 → "denied: <reason>" (exit 1), other 4xx → the Gateway's detail (exit 1), unreachable → exit 2, unknown outcome → exit 4.
  - Done when: `go test ./internal/cli/ -run 'PrepareChange|WriteError'` passes covering yes/no/closed input, Production with a flag, a prompt, a blank reason and `--yes` without a reason, and each error mapping.
- [ ] **T111.3 `kafka3o produce`** — Covers: F66-AC2
  - Files: internal/messages/produce_message.go (new), internal/messages/produce_message_test.go (new), internal/cli/new_produce_command.go (new), internal/cli/new_produce_command_test.go (new), cmd/kafka3o/main.go
  - Do: `--value` (required), `--key`, repeatable `--header key=value` in order; the confirmation shows topic, key, headers and value (escaped); prints "Written to partition P at offset O." (exact offset) or JSON.
  - Done when: `go test ./internal/messages/ ./internal/cli/ -run 'ProduceMessage|ProduceCommand'` passes covering the body sent (headers in order), the printed offset, a bad header, cancel and Production.

## Review
