# P115 · F66-B6 — Offset reset with a preview
- **Milestone:** M20
- **Covers:** F66-AC6
- **Discovery:** —
- **Status:** Building

## Demo
1. `kafka3o reset-offsets kafka-a connect-kafka3o-backup-probe kafka3o-m10-verify --to latest` shows the preview (partition, current, new), asks, applies and prints the committed offsets; `kafka3o group` shows lag 0.
2. The active group `connect-kafka3o-backup-kafka3o-m10-verify` is refused with the Gateway's reason, and nothing is changed.

## Tasks
- [ ] **T115.1 `kafka3o reset-offsets`** — Covers: F66-AC6
  - Files: Kafka3O-cli internal/groups/offset_reset.go (new), internal/groups/preview_offset_reset.go (new), internal/groups/preview_offset_reset_test.go (new), internal/groups/apply_offset_reset.go (new), internal/groups/apply_offset_reset_test.go (new), internal/groups/parse_reset_target.go (new), internal/groups/parse_reset_target_test.go (new), internal/cli/new_reset_offsets_command.go (new), internal/cli/new_reset_offsets_command_test.go (new), cmd/kafka3o/main.go
  - Do: `--to earliest|latest|<RFC 3339 or Unix ms>`; the preview reads `/api/v1/consumer-groups/{group}/offset-reset?topic&target[&timestamp]` (a read: no confirmation); apply posts `{topic, partitions: [{partition, expectedOffset, targetOffset}]}` exactly as previewed (like the UI) after the confirmation and reason, and checks the group and topic in the answer; refusals show the Gateway's detail; `offset_reset_unknown` exits 4.
  - Done when: `go test ./internal/groups/ ./internal/cli/ -run 'ResetTarget|PreviewOffsetReset|ApplyOffsetReset|ResetOffsetsCommand'` passes covering the three targets, the preview table, the exact apply body, cancel, an active group, a changed basis and Production.

## Review
