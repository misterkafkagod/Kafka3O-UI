# P104 · F62-B2 + F62-B3 — One topic, and not found
- **Milestone:** M18
- **Covers:** F62-AC2, F62-AC3
- **Discovery:** —
- **Status:** Building

## Demo
1. `kafka3o topic kafka-a kafka3o-m10-verify`: partitions (leader, replicas, ISR, start and end offsets), configuration (sensitive values hidden), consumer groups reading the topic with committed offset, end offset and lag per partition, and the backup (state, settings, last write, stored).
2. `-o json` gives the same sections; `kafka3o topic kafka-a nope` exits 1 with "topic nope was not found on kafka-a"; `kafka3o topic nope x` exits 1 with "cluster nope not found or not accessible".

## Tasks
- [ ] **T104.1 Read one topic's sections** — Covers: F62-AC2, F62-AC3
  - Files: Kafka3O-cli internal/topics/topic_view.go (new), internal/topics/describe_topic.go (new), internal/topics/describe_topic_test.go (new), internal/topics/groups_reading_topic.go (new), internal/topics/groups_reading_topic_test.go (new)
  - Do: `DescribeTopic` checks the cluster is accessible (else `ErrUnknownCluster`), reads `/api/v1/topics/{topic}` (404 → `ErrTopicNotFound`; another failure → classified, exit 2), `/api/v1/consumer-groups` and `/api/v1/backups` concurrently; a failing group or backup read is kept as that section's error, not the command's; `GroupsReadingTopic` keeps the groups whose topics include it and only that topic's partitions (as the UI), and counts groups that could not be read; offsets and lag stay exact (integers and decimal strings as the Gateway sends them).
  - Done when: `go test ./internal/topics/ -run 'DescribeTopic|GroupsReadingTopic'` passes covering a full topic, no groups, a failing groups read, backups not configured, a missing topic, an unknown cluster and an unreachable cluster.
- [ ] **T104.2 `kafka3o topic <cluster> <topic>`** — Covers: F62-AC2, F62-AC3
  - Files: internal/cli/new_topic_command.go (new), internal/cli/new_topic_command_test.go (new), internal/cli/write_topic_view.go (new), internal/cli/write_topic_view_test.go (new), cmd/kafka3o/main.go
  - Do: text sections Partitions, Configuration, Consumer groups and Backup (each saying why it is unavailable when it is), or the whole view as JSON; exit codes per F62-AC3.
  - Done when: `go test ./internal/cli/ -run 'TopicCommand|WriteTopicView'` passes covering the text and JSON views, a missing topic (exit 1), an unknown cluster (exit 1) and an unreachable cluster (exit 2).

## Review
