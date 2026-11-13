# P109 · F65-B1 — Consumer groups across clusters
- **Milestone:** M19
- **Covers:** F65-AC1
- **Discovery:** —
- **Status:** Done

## Demo
1. `kafka3o groups`: every group on Kafka A (and none on Kafka B) with cluster, state, members, topics and total lag; groups with uncommitted partitions read "unknown (n partitions)".
2. `kafka3o groups --filter m16`: only the probe groups; a failing cluster is reported on stderr with exit 2.

## Tasks
- [x] **T109.1 Groups across clusters with exact total lag** — Covers: F65-AC1
  - Files: Kafka3O-cli internal/groups/consumer_group.go (new), internal/groups/list_groups.go (new), internal/groups/list_groups_test.go (new), internal/groups/total_lag.go (new), internal/groups/total_lag_test.go (new), internal/groups/compare_groups.go (new), internal/groups/compare_groups_test.go (new)
  - Do: `ListGroups` reads `/api/v1/consumer-groups` on the chosen or every accessible cluster through `clusters.ReadAcrossClusters` (cluster order, then group id); `TotalLag` is a port of the UI's consumerGroupTotalLag (exact big-integer sum; unknown partitions counted, never added as 0).
  - Done when: `go test ./internal/groups/` passes covering exact sums above 2^53, unknown partitions, a group without partitions, ordering and a failing cluster.
- [x] **T109.2 `kafka3o groups`** — Covers: F65-AC1
  - Files: internal/cli/new_groups_command.go (new), internal/cli/new_groups_command_test.go (new), cmd/kafka3o/main.go
  - Do: `groups [--cluster] [--filter]` table `CLUSTER GROUP STATE MEMBERS TOPICS TOTAL LAG` (failures on stderr, exit 2) or JSON with the total lag per group; "No consumer groups." when nothing matches.
  - Done when: `go test ./internal/cli/ -run GroupsCommand` passes covering the table, JSON, the filter, unknown lag and a failing cluster.

## Review
- **Demo:** tests with a fake Console cover the demo: groups across clusters sorted by cluster then id, an exact total lag, "unknown (3 partitions)" for missing commits, the filter, an empty cluster, JSON with the total lag per group, and a failing cluster on stderr with exit 2. Live run pending (M19 verification debt). Auto-approval, 2026-11-13
- **Tests:** `go test -race ./...` passed
- **Conventions:** `ListGroups`, `TotalLag` (port of the UI's consumerGroupTotalLag), `CompareGroups`, `describeTotalLag` are single actions
- **Vulnerability scan:** not needed
- **Live (2026-11-13):** passed on EKS-D as admin: groups listed Kafka A's 9 groups (two "unknown (3 partitions)", the probe groups at 58) and none on Kafka B; --filter m16 kept the three probe groups.
