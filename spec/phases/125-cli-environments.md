# P125 · F68-B5 — Cluster environments
- **Milestone:** M22
- **Covers:** F68-AC5
- **Discovery:** —
- **Status:** Done

## Demo
1. `kafka3o environments` lists Kafka A (Non-production) and Kafka B (Production) with name, active state and Gateway.
2. `environment set kafka-a production --yes` without a reason is refused before sending; with `--reason "P125 demo"` the confirmation shows "Non-production → Production" and the reason, and answering "n" sends nothing; `environment set kafka-a non-production` says nothing to change. No environment is changed.

## Tasks
- [x] **T125.1 Registered clusters and reclassification** — Covers: F68-AC5
  - Files: Kafka3O-cli internal/environments/registered_cluster.go (new), internal/environments/list_registered_clusters.go (new), internal/environments/list_registered_clusters_test.go (new), internal/environments/parse_environment.go (new), internal/environments/parse_environment_test.go (new), internal/environments/change_cluster_environment.go (new), internal/environments/change_cluster_environment_test.go (new), internal/environments/fake_console_test.go (new)
  - Do: `ListRegisteredClusters` reads `/api/admin/clusters`; `ParseEnvironment` takes production or non-production (also PRODUCTION / NON_PRODUCTION); `ChangeClusterEnvironment` puts `{expectedEnvironment, environment, reason}` to `/api/admin/clusters/{id}/environment` and requires the operation id and policy revision.
  - Done when: `go test ./internal/environments/` passes covering the listing, the environment names, the body and path, and a missing answer.
- [x] **T125.2 `kafka3o environments` and `environment set`** — Covers: F68-AC5
  - Files: internal/cli/new_environments_command.go (new), internal/cli/new_environments_command_test.go (new), internal/cli/new_environment_command.go (new), internal/cli/new_environment_command_test.go (new), cmd/kafka3o/main.go
  - Do: `environments` prints `CLUSTER NAME ENVIRONMENT ACTIVE GATEWAY` or JSON. `environment set <cluster> <environment> [--reason] [--yes]` reads the listing (unknown cluster → not found), stops with "Nothing to change" when it already matches, requires a reason (with `--yes` and none → refused before sending; otherwise asked, blank cancels), confirms with name, old → new and the reason, sends the environment read as the expected one, and prints the new policy revision; refusals go through `adminError`.
  - Done when: `go test ./internal/cli/ -run 'EnvironmentsCommand|EnvironmentCommand'` passes covering the table, a change, nothing to change, a missing reason with and without `--yes`, cancel, an unknown cluster, a conflict and exit 4.

## Review
- **Demo:** live on EKS-D as admin (auto-approval, 2026-11-13): `environments` listed Kafka A (Non-production) and Kafka B (Production), both active, with their Gateways; `environment set kafka-a production --yes` without a reason was refused before sending; with `--reason "P125 demo"` the confirmation showed "Classify Kafka A (kafka-a): Non-production → Production" and the reason, and "n" sent nothing; `environment set kafka-a non-production` printed "Nothing to change"; `environments` afterwards was unchanged. A real reclassification, a conflict and an unknown outcome are covered by tests only
- **Tests:** `go test -race ./...` passed
- **Conventions:** `ListRegisteredClusters`, `ParseEnvironment`, `ChangeClusterEnvironment` and the two commands are single actions; `registered_cluster.go` holds data types only
- **Vulnerability scan:** not needed (no dependency change)
