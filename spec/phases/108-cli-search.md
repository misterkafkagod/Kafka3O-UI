# P108 · F64-B3 — Search messages
- **Milestone:** M19
- **Covers:** F64-AC3
- **Discovery:** —
- **Status:** Building

## Demo
1. `kafka3o search kafka-a kafka3o-m10-verify "check two"`: the original and its restored copy, then "Scanned N messages."
2. A text found nowhere prints "No messages contain <text>." with the scanned count; a cut-short scan adds that only the 500 most recent were searched.

## Tasks
- [ ] **T108.1 `kafka3o search`** — Covers: F64-AC3
  - Files: Kafka3O-cli internal/messages/search_messages.go (new), internal/messages/search_messages_test.go (new), internal/cli/new_search_command.go (new), internal/cli/new_search_command_test.go (new), cmd/kafka3o/main.go
  - Do: `SearchMessages` reads `/api/v1/topics/{topic}/messages/search?query=<text>` (messages, scanned, truncated); the command prints the matches with `WriteMessages` (and `--value`), then the scanned count and the truncation note, or "No messages contain <text>."; `-o json` writes the Gateway's answer; an empty text is refused (exit 1); errors as for `messages`.
  - Done when: `go test ./internal/messages/ ./internal/cli/ -run 'SearchMessages|SearchCommand'` passes covering matches with the count, no match, a truncated scan, JSON, an empty text, a missing topic and an unreachable cluster.

## Review
