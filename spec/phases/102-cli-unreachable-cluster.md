# P102 · F61-B3 — A cluster that cannot be reached
- **Milestone:** M18
- **Covers:** F61-AC3
- **Discovery:** —
- **Status:** Done

## Demo
1. With one cluster's Gateway failing (a fake Console in the tests; the shared EKS-D Gateways are not stopped for a demo): the healthy cluster's row is complete, the failing one reads "Gateway unreachable: The Gateway could not be reached", and the exit code is 2.
2. `-o json` still prints every cluster, the failing one with `"status": "gateway_unreachable"` and its reason, and exits 2.

## Tasks
- [x] **T102.1 Name each failure like the UI** — Covers: F61-AC3
  - Files: Kafka3O-cli internal/clusters/classify_cluster_error.go (new), internal/clusters/classify_cluster_error_test.go (new), internal/clusters/read_cluster_health.go, internal/clusters/read_cluster_health_test.go
  - Do: `ClassifyClusterError` maps the Console's problem codes as the UI does: `gateway_unavailable` → gateway unreachable, `cluster_unreachable` → cluster unreachable (with the Gateway's detail), 403 `forbidden` → access denied, `authorization_unavailable` → authorization unavailable, a transport failure → gateway unreachable, anything else → unavailable; the reason is the problem's detail or title.
  - Done when: `go test ./internal/clusters/ -run 'ClassifyClusterError|ReadClusterHealth'` passes covering each code and a transport error.
- [x] **T102.2 Exit code 2 when a cluster failed** — Covers: F61-AC3
  - Files: internal/cli/new_clusters_command.go, internal/cli/new_clusters_command_test.go
  - Do: after printing the table or the JSON, `clusters` returns `ErrClusterFailed` (exit 2) when any cluster is not healthy; the printed result is unchanged.
  - Done when: `go test ./internal/cli/ -run Clusters` passes covering one failing cluster in the table and in JSON (exit 2, healthy row complete).

## Review
- **Demo:** with a fake Console whose kafka-b Gateway answers 503 `gateway_unavailable`: the table shows kafka-a complete and kafka-b "Gateway unreachable: The Gateway could not be reached"; `-o json` lists both with `"status": "gateway_unreachable"`; both exit 2 ("1 of 2 clusters: at least one cluster could not answer"). Live on EKS-D both clusters are healthy and `clusters` exits 0. The shared Gateways were not stopped for a demo (auto-approval, 2026-11-12)
- **Tests:** `go test -race ./...` passed
- **Conventions:** `ClassifyClusterError` is a single action
- **Vulnerability scan:** not needed

