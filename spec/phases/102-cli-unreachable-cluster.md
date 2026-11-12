# P102 · F61-B3 — A cluster that cannot be reached
- **Milestone:** M18
- **Covers:** F61-AC3
- **Discovery:** —
- **Status:** Building

## Demo
1. With one cluster's Gateway failing (a fake Console in the tests; the shared EKS-D Gateways are not stopped for a demo): the healthy cluster's row is complete, the failing one reads "Gateway unreachable: The Gateway could not be reached", and the exit code is 2.
2. `-o json` still prints every cluster, the failing one with `"status": "gateway_unreachable"` and its reason, and exits 2.

## Tasks
- [ ] **T102.1 Name each failure like the UI** — Covers: F61-AC3
  - Files: Kafka3O-cli internal/clusters/classify_cluster_error.go (new), internal/clusters/classify_cluster_error_test.go (new), internal/clusters/read_cluster_health.go, internal/clusters/read_cluster_health_test.go
  - Do: `ClassifyClusterError` maps the Console's problem codes as the UI does: `gateway_unavailable` → gateway unreachable, `cluster_unreachable` → cluster unreachable (with the Gateway's detail), 403 `forbidden` → access denied, `authorization_unavailable` → authorization unavailable, a transport failure → gateway unreachable, anything else → unavailable; the reason is the problem's detail or title.
  - Done when: `go test ./internal/clusters/ -run 'ClassifyClusterError|ReadClusterHealth'` passes covering each code and a transport error.
- [ ] **T102.2 Exit code 2 when a cluster failed** — Covers: F61-AC3
  - Files: internal/cli/new_clusters_command.go, internal/cli/new_clusters_command_test.go
  - Do: after printing the table or the JSON, `clusters` returns `ErrClusterFailed` (exit 2) when any cluster is not healthy; the printed result is unchanged.
  - Done when: `go test ./internal/cli/ -run Clusters` passes covering one failing cluster in the table and in JSON (exit 2, healthy row complete).

## Review
