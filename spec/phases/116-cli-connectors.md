# P116 · F67-B1 — Connectors across clusters
- **Milestone:** M21
- **Covers:** F67-AC1
- **Discovery:** —
- **Status:** Building

## Demo
1. `kafka3o connectors`: Kafka A's test connectors with type, state, worker and task states (failed items' errors listed below the table); Kafka B either lists its connectors or says "Kafka Connect is not configured for this cluster." without failing.
2. `kafka3o connectors -o json`: the same per cluster, with `notConfigured` and the failures.

## Tasks
- [x] **T116.1 Connectors across clusters** — Covers: F67-AC1
  - Files: Kafka3O-cli internal/connect/connector.go (new), internal/connect/list_connectors.go (new), internal/connect/list_connectors_test.go (new)
  - Do: `ListConnectors` reads `/api/v1/connect/connectors` on the chosen or every accessible cluster through `clusters.ReadAcrossClusters`; a `connect_not_configured` problem becomes `NotConfigured` for that cluster (not a failure); any other error is that cluster's failure; connectors are sorted by name and tasks by id. Data types only in `connector.go`.
  - Done when: `go test ./internal/connect/` passes covering sorting, a not-configured cluster, an unreachable Connect (a failure) and a signed-out session.
- [ ] **T116.2 `kafka3o connectors`** — Covers: F67-AC1
  - Files: internal/cli/new_connectors_command.go (new), internal/cli/new_connectors_command_test.go (new), cmd/kafka3o/main.go
  - Do: `connectors [--cluster]` prints the table `CLUSTER CONNECTOR TYPE STATE WORKER TASKS` (tasks as `id:STATE`), then an "Errors" list (`<cluster> <connector>: …` and `… task <id>: …`), then one line per not-configured cluster; every Connect-supplied text is terminal-escaped; failures on stderr with exit 2; `-o json` prints `{clusters:[{cluster, notConfigured, connectors}], failures}`; "No connectors." when none.
  - Done when: `go test ./internal/cli/ -run ConnectorsCommand` passes covering the table, the errors list, escaping, a not-configured cluster, JSON and a failing cluster.

## Review
