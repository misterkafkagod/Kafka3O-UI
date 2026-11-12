# P101 · F61-B1 + F61-B2 — Clusters as a table and JSON
- **Milestone:** M18
- **Covers:** F61-AC1, F61-AC2
- **Discovery:** discovery/cli-console-session.md
- **Status:** Building

## Demo
1. `kafka3o clusters`: Kafka A (Non-production) and Kafka B (Production), each Healthy with its cluster ID, controller and broker count, read in parallel.
2. `kafka3o clusters -o json`: the same values as JSON.

## Tasks
- [ ] **T101.1 Cluster health across all clusters** — Covers: F61-AC1, F61-AC2
  - Files: Kafka3O-cli internal/clusters/cluster_health.go (new), internal/clusters/gateway_path.go (new), internal/clusters/gateway_path_test.go (new), internal/clusters/read_cluster_health.go (new), internal/clusters/read_cluster_health_test.go (new), internal/clusters/list_cluster_health.go (new), internal/clusters/list_cluster_health_test.go (new)
  - Do: `GatewayPath(id, path)` builds `/api/clusters/{escaped id}/gateway<path>`; `ReadClusterHealth` reads `/api/v1/cluster` through it (cluster ID, controller, brokers) and on failure keeps the error as the cluster's status instead of failing; `ListClusterHealth` lists the accessible clusters and reads them concurrently, keeping the Console's order; a signed-out session fails the whole command.
  - Done when: `go test ./internal/clusters/` passes covering two healthy clusters, the order kept under concurrency, an escaped cluster ID, a failing cluster kept as a row and a signed-out session.
- [ ] **T101.2 `kafka3o clusters`** — Covers: F61-AC1, F61-AC2
  - Files: internal/cli/new_clusters_command.go (new), internal/cli/new_clusters_command_test.go (new), cmd/kafka3o/main.go
  - Do: table `CLUSTER NAME ENVIRONMENT ROLE STATUS BROKERS CONTROLLER` (Production marked as in `whoami`), or the list as JSON with `-o json`.
  - Done when: `go test ./internal/cli/ -run Clusters` passes covering the table, JSON with the same values, and not signed in.

## Review
