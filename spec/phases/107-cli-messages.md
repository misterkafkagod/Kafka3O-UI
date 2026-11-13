# P107 · F64-B1 + F64-B2 — Read messages
- **Milestone:** M19
- **Covers:** F64-AC1, F64-AC2
- **Discovery:** —
- **Status:** Done

## Demo
1. `kafka3o messages kafka-a kafka3o-m10-verify`: the latest messages, each with partition, exact offset, timestamp, key, headers and value.
2. `--partition 0 --offset 61` reads from that offset; `--partition 0 --timestamp 2026-11-12T04:08:00Z` from that time; `--offset 5` alone exits 1 before anything is sent.
3. `--value json` pretty-prints JSON values (invalid JSON shows "(not valid JSON, shown as text)"); `--value base64` shows the bytes as sent; `-o json` writes the Gateway's messages.

## Tasks
- [x] **T107.1 Read messages and format values** — Covers: F64-AC1, F64-AC2
  - Files: Kafka3O-cli internal/messages/message.go (new), internal/messages/parse_position.go (new), internal/messages/parse_position_test.go (new), internal/messages/read_messages.go (new), internal/messages/read_messages_test.go (new), internal/messages/format_value.go (new), internal/messages/format_value_test.go (new), internal/messages/escape_terminal_text.go (new), internal/messages/escape_terminal_text_test.go (new)
  - Do: `ParsePosition` turns `--partition/--offset/--timestamp` into the Gateway's query (partition required with offset or timestamp, not both; timestamp as RFC 3339 or Unix milliseconds; negative values refused); `ReadMessages` reads `/api/v1/topics/{topic}/messages` with it (404 → not found); `FormatValue` is a port of the UI's `formatMessageValue`; `EscapeTerminalText` escapes control characters except line breaks and tabs.
  - Done when: `go test ./internal/messages/` passes covering each position rule, both timestamp forms, the three formats with the UI's cases (text, pretty JSON, invalid JSON note, invalid UTF-8), a null key or value, and an escape sequence.
- [x] **T107.2 `kafka3o messages`** — Covers: F64-AC1, F64-AC2
  - Files: internal/messages/write_messages.go (new), internal/messages/write_messages_test.go (new), internal/cli/new_messages_command.go (new), internal/cli/new_messages_command_test.go (new), cmd/kafka3o/main.go
  - Do: one block per message (partition, offset, timestamp, key, headers, value with its note), keys and header values shown as text, everything escaped for the terminal; "No messages." when empty; `-o json` writes the Gateway's answer; failures and exit codes as for `topic`.
  - Done when: `go test ./internal/messages/ ./internal/cli/ -run 'WriteMessages|MessagesCommand'` passes covering the blocks, an escape sequence in a value and a header, JSON output, a refused position (exit 1), a missing topic (exit 1) and an unreachable cluster (exit 2).

## Review
- **Demo:** tests with a fake Console cover the demo: latest messages as blocks, reading from an offset (exact query sent), pretty JSON and the invalid-JSON note, base64, `-o json`, an offset without `--partition` refused before sending, a missing topic (exit 1) and an unreachable cluster (exit 2); a value carrying a terminal-title escape sequence is printed escaped. Live run pending (M19 verification debt). Auto-approval, 2026-11-13
- **Tests:** `go test -race ./...` passed
- **Conventions:** `ParsePosition`, `ReadMessages`, `FormatValue` (port of the UI's formatMessageValue), `EscapeTerminalText`, `WriteMessages`, `RequireAccessibleCluster`, `topicReadError` are single actions
- **Vulnerability scan:** not needed
- **Notes:** a heredoc turned a `\u202e` test expectation into the real character; test files are now checked for raw control bytes.
- **Live (2026-11-13):** passed on EKS-D as admin: latest read returned 50 messages with headers including kafka3o-restore; --partition 0 --offset 61 and --partition 3 --timestamp 2026-11-12T04:08:00Z read from the right place; --value json pretty-printed a JSON value; --offset alone and a missing topic exited 1.
