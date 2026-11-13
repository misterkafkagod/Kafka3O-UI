# P113 · F66-B4 — Configuration changes
- **Milestone:** M20
- **Covers:** F66-AC4
- **Discovery:** —
- **Status:** Building

## Demo
1. On a temporary topic `kafka3o-cli-p113`: `kafka3o config set kafka-a topic kafka3o-cli-p113 retention.ms 3600000` shows "retention.ms: 604800000 → 3600000", asks and applies; `config reset … retention.ms` resets it to the default.
2. `kafka3o config set kafka-a broker 1 log.retention.hours 1` is refused because the setting is read-only; a sensitive setting is refused the same way.

## Tasks
- [ ] **T113.1 Configuration changes, and every uncertain write** — Covers: F66-AC4, F66-AC1
  - Files: Kafka3O-cli internal/console/send_json.go, internal/console/send_json_test.go, internal/clusters/configuration_resource.go (new), internal/clusters/read_configuration.go (new), internal/clusters/read_configuration_test.go (new), internal/clusters/change_configuration.go (new), internal/clusters/change_configuration_test.go (new)
  - Do: every problem code ending in `_unknown` becomes `ErrOutcomeUnknown`; `ReadConfiguration` reads a topic's (`/api/v1/topics/{t}/config`) or broker's configuration; `ChangeConfiguration` posts `{name, operation: "set"|"reset", value}` and requires `{status: "accepted", name}`.
  - Done when: `go test ./internal/console/ ./internal/clusters/ -run 'SendJSON|ReadConfiguration|ChangeConfiguration'` passes covering each `_unknown` code, both resources, set, reset and an unconfirmed answer.
- [ ] **T113.2 `kafka3o config set|reset`** — Covers: F66-AC4
  - Files: internal/cli/new_config_command.go (new), internal/cli/new_config_command_test.go (new), cmd/kafka3o/main.go
  - Do: `config set <cluster> topic <name>|broker <id> <setting> <value>` and `config reset <cluster> topic|broker <name|id> <setting>`; reads the configuration first, refuses an unknown, sensitive or read-only setting before sending, shows "old → new" in the confirmation; Gateway refusals show their detail.
  - Done when: `go test ./internal/cli/ -run ConfigCommand` passes covering set and reset on a topic and a broker, an unknown, a read-only and a sensitive setting, a Kafka rejection and Production.

## Review
