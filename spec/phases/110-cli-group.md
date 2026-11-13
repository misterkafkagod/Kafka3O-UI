# P110 · F65-B2 — One group's offsets
- **Milestone:** M19
- **Covers:** F65-AC2
- **Discovery:** —
- **Status:** Done

## Demo
1. `kafka3o group kafka-a connect-kafka3o-backup-kafka3o-m10-verify`: state, its member (id, client, host) and, per topic, each partition's committed offset, log start, log end, lag and status.
2. `kafka3o group kafka-a nope` exits 1 with "group nope was not found on kafka-a"; `-o json` gives the group as the Gateway describes it.

## Tasks
- [x] **T110.1 `kafka3o group`** — Covers: F65-AC2
  - Files: Kafka3O-cli internal/groups/status_label.go (new), internal/groups/status_label_test.go (new), internal/groups/write_group.go (new), internal/groups/write_group_test.go (new), internal/cli/new_group_command.go (new), internal/cli/new_group_command_test.go (new), cmd/kafka3o/main.go
  - Do: the command reads the cluster's groups with `ListGroups` and picks the group (missing → `ErrGroupNotFound`, exit 1); `WriteGroup` shows state, members and a table per topic (`PARTITION COMMITTED START END LAG STATUS`, unknown values as "unknown", statuses with the UI's labels from `StatusLabel`); the group's own error is shown; `-o json` writes the group.
  - Done when: `go test ./internal/groups/ ./internal/cli/ -run 'StatusLabel|WriteGroup|GroupCommand'` passes covering two topics, unknown offsets, each status label, a group error, a missing group, an unknown cluster and an unreachable cluster.

## Review
- **Demo:** tests with a fake Console cover the demo: state and protocol, members, a table per topic in the Gateway's order with exact offsets, "unknown" for unreported values, the UI's status labels, a group error, `-o json`, a missing group (exit 1), an unknown cluster (exit 1) and an unreachable cluster (exit 2). Live run pending (M19 verification debt). Auto-approval, 2026-11-13
- **Tests:** `go test -race ./...` passed
- **Conventions:** `StatusLabel` (port of the UI's consumerLagStatusLabel), `WriteGroup`, `offsetText` are single actions
- **Vulnerability scan (milestone):** `govulncheck@v1.9.0 ./...`: no vulnerabilities (no dependency change in M19)
- **Live (2026-11-13):** passed on EKS-D as admin: group connect-kafka3o-backup-kafka3o-m10-verify showed its member and offsets 65/3/48/25 with lag 0; connect-kafka3o-backup-e2e showed "No committed offset" for three partitions; a missing group exited 1.
