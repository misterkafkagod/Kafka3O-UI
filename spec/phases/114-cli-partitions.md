# P114 · F66-B5 — Partitions and replica placement
- **Milestone:** M20
- **Covers:** F66-AC5
- **Discovery:** —
- **Status:** Done

## Demo
1. `kafka3o partitions add kafka-a kafka3o-cli-p113 2` shows "1 → 2 partitions", asks and applies; `topic` shows two partitions; `partitions add … 2` again is refused before sending.
2. `kafka3o partitions reassign kafka-a kafka3o-cli-p113 0 1` is accepted; `kafka3o reassignments kafka-a kafka3o-cli-p113` says none are in progress; `reassign … 0 1,1` is refused (duplicate broker). The temporary topic is then deleted.

## Tasks
- [x] **T114.1 `kafka3o partitions add|reassign` and `kafka3o reassignments`** — Covers: F66-AC5
  - Files: Kafka3O-cli internal/topics/increase_partitions.go (new), internal/topics/increase_partitions_test.go (new), internal/topics/reassign_partition.go (new), internal/topics/reassign_partition_test.go (new), internal/topics/list_reassignments.go (new), internal/topics/list_reassignments_test.go (new), internal/topics/parse_broker_ids.go (new), internal/topics/parse_broker_ids_test.go (new), internal/cli/new_partitions_command.go (new), internal/cli/new_partitions_command_test.go (new), internal/cli/new_reassignments_command.go (new), internal/cli/new_reassignments_command_test.go (new), cmd/kafka3o/main.go
  - Do: `add` reads the topic first and refuses a total not above the current count, then posts `{count}` (the new total); `reassign` takes distinct non-negative broker ids ("1,2,3") and posts `{replicas}`; both require `{status: "accepted", topic}`; `reassignments` lists partition, replicas, adding and removing, or "No reassignments in progress."
  - Done when: `go test ./internal/topics/ ./internal/cli/ -run 'IncreasePartitions|ReassignPartition|Reassignments|BrokerIDs|PartitionsCommand'` passes covering both bodies, a total not above the current one, duplicate or bad broker ids, an unconfirmed answer, and the list with and without moves.

## Review
- **Demo:** live on EKS-D as admin on `kafka3o-cli-p113` (auto-approval, 2026-11-13): `partitions add … 2` showed "1 → 2 partitions", applied, and was accepted; an immediate second `add … 2` still saw one partition (Kafka's metadata had not caught up) and was refused by the Gateway instead; `partitions reassign … 0 1` and `… 0 7` were refused by the Gateway (Kafka A has one broker, so no changed placement exists and broker 7 does not exist); `reassignments` said none are in progress; `0 1,1` was refused before sending; the temporary topic was deleted. A successful replica move needs a cluster with more than one broker and was only covered by tests
- **Tests:** `go test -race ./...` passed
- **Conventions:** `IncreasePartitions`, `ReassignPartition`, `ListReassignments`, `ParseBrokerIDs`, `describeError` are single actions; `topic` now uses `describeError`
- **Vulnerability scan:** not needed
- **Notes:** the local "total must be higher" check reads the topic first and can be stale for a moment after a change; the Gateway's check is the one that counts.

