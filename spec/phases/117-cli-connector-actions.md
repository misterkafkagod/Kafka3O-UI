# P117 · F67-B2 — Connector lifecycle
- **Milestone:** M21
- **Covers:** F67-AC2
- **Discovery:** —
- **Status:** Building

## Demo
1. `kafka3o connector pause kafka-a kafka3o-verify-paused` shows `Pause connector "kafka3o-verify-paused"?`, and after "y" prints "Pause requested for kafka3o-verify-paused."; `connectors` then shows it PAUSED; `resume` brings it back to RUNNING.
2. `kafka3o connector restart kafka-a kafka3o-verify-running --yes` and `restart-task kafka-a kafka3o-verify-running 0 --yes` are requested; `restart-task … 9` reads not found; `restart-task … x` is refused before sending.

## Tasks
- [x] **T117.1 Run a connector action** — Covers: F67-AC2
  - Files: Kafka3O-cli internal/connect/connector_action.go (new), internal/connect/run_connector_action.go (new), internal/connect/run_connector_action_test.go (new), internal/connect/fake_send_test.go (new)
  - Do: `RunConnectorAction` posts (no body) to `/api/v1/connect/connectors/{name}/pause|resume|restart` or `…/tasks/{id}/restart` (name path-escaped) with the reason, and requires the Gateway's `{connector, action[, task]}` echo (a mismatch is "may have been applied"); a `not_found` problem becomes `ErrConnectorNotFound` ("connector X not found on C" or "task N of connector X not found on C"); other problems pass through for `writeError`. `connector_action.go` holds the data types and the not-found error.
  - Done when: `go test ./internal/connect/ -run RunConnectorAction` passes covering the four paths, the reason, an escaped name, the echo check, not found and an unknown outcome.
- [x] **T117.2 `kafka3o connector`** — Covers: F67-AC2
  - Files: internal/cli/new_connector_command.go (new), internal/cli/new_connector_command_test.go (new), cmd/kafka3o/main.go
  - Do: `connector pause|resume|restart <cluster> <name>` and `connector restart-task <cluster> <name> <task>` (task a non-negative integer, checked before anything is sent) with `--yes`/`--reason`; the summary is the UI's confirmation (`Pause connector "X"?`, `Restart connector "X" and its tasks?`, `Restart task N of connector "X"?`, name escaped); success prints the UI's "… requested for …" line; refusals go through `writeError`.
  - Done when: `go test ./internal/cli/ -run ConnectorCommand` passes covering each action, cancel, Production without a reason, a bad task id, not found, a Connect rejection and exit 4.

## Review
