# P112 · F66-B3 — Create and delete a topic
- **Milestone:** M20
- **Covers:** F66-AC3
- **Discovery:** —
- **Status:** Building

## Demo
1. `kafka3o create-topic kafka-a kafka3o-cli-p112 --partitions 1 --replication-factor 1` asks and creates it; `kafka3o topics --filter cli-p112` lists it.
2. `kafka3o delete-topic kafka-a kafka3o-cli-p112` asks for the name; a mistyped name sends nothing; the right name deletes it.

## Tasks
- [ ] **T112.1 `kafka3o create-topic` and `kafka3o delete-topic`** — Covers: F66-AC3
  - Files: Kafka3O-cli internal/topics/validate_topic_name.go (new), internal/topics/validate_topic_name_test.go (new), internal/topics/create_topic.go (new), internal/topics/create_topic_test.go (new), internal/topics/delete_topic.go (new), internal/topics/delete_topic_test.go (new), internal/cli/new_create_topic_command.go (new), internal/cli/new_create_topic_command_test.go (new), internal/cli/new_delete_topic_command.go (new), internal/cli/new_delete_topic_command_test.go (new), cmd/kafka3o/main.go
  - Do: names follow Kafka's rules (1–249 of `[A-Za-z0-9._-]`, not `.` or `..`), partitions and replication factor at least 1, all checked before sending; create posts `{name, partitions, replicationFactor}` and checks the echo; delete asks "Type the topic name to delete it:" (or takes `--confirm <topic>`; `--yes` alone is refused) before the usual change confirmation and reason; a mismatch sends nothing.
  - Done when: `go test ./internal/topics/ ./internal/cli/ -run 'TopicName|CreateTopic|DeleteTopic'` passes covering the name rules, the bodies sent, an existing topic refused with the Gateway's reason, a mistyped confirmation, `--confirm`, and Production.

## Review
