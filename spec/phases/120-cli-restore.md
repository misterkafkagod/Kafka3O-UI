# P120 · F67-B5 — Restore with a selection and progress
- **Milestone:** M21
- **Covers:** F67-AC5
- **Discovery:** —
- **Status:** Building

## Demo
1. `kafka3o restore kafka-a kafka3o-m10-verify --partitions 1 --wait` names the selection, says the messages are appended and may be duplicated, asks, prints "Restore started for kafka3o-m10-verify from N stored objects." and then progress lines until "Restore finished: M records restored."; `messages kafka-a kafka3o-m10-verify --partition 1` shows the appended copies with the `kafka3o-restore` header.
2. `--from 2026-11-13T12:00:00Z --to 2026-11-13T11:00:00Z` and `--partitions x` are refused before sending; a restore on Kafka B without a reason sends nothing.

## Tasks
- [x] **T120.1 Start a restore with a selection** — Covers: F67-AC5
  - Files: Kafka3O-cli internal/backups/restore.go (new), internal/backups/parse_restore_selection.go (new), internal/backups/parse_restore_selection_test.go (new), internal/backups/start_restore.go (new), internal/backups/start_restore_test.go (new)
  - Do: `ParseRestoreSelection(from, to, partitions, chosen)` returns nil (everything) when no selection flag was given; otherwise times are RFC 3339 or Unix milliseconds, the start must be before the end, partitions are comma-separated non-negative numbers (distinct, sorted), and a selection whose flags are all empty is refused like the UI ("Choose a time range or partitions, or restore everything."). `StartRestore` posts the selection (no body for everything) to `/api/v1/backups/{topic}/restore` and requires the answer's topic. `restore.go` holds the data types.
  - Done when: `go test ./internal/backups/ -run 'ParseRestoreSelection|StartRestore'` passes covering everything, each bound, both time forms, a reversed range, bad and repeated partitions, an all-empty selection, the bodies and the echo check.
- [x] **T120.2 Follow a restore** — Covers: F67-AC5
  - Files: internal/backups/sleep.go (new), internal/backups/wait_for_restore.go (new), internal/backups/wait_for_restore_test.go (new), internal/topics/topic_view.go
  - Do: `WaitForRestore` lists the cluster's backups every 5 seconds (an injected `Sleep`, cancelled with the context) and writes a progress line whenever "restoring X of Y records" changes; it returns when the restore with the started id reports finished, or a failure (the restore's error), or when that restore is no longer listed (finished by another listing, since the Gateway finishes restores while listing). `BackupRestore` gains `restoreId`.
  - Done when: `go test ./internal/backups/ -run WaitForRestore` passes covering progress to finished, a failure, a restore that disappears, a missing backup and cancellation.
- [x] **T120.3 `kafka3o restore`** — Covers: F67-AC5
  - Files: internal/cli/new_restore_command.go (new), internal/cli/new_restore_command_test.go (new), internal/cli/run_backup_change.go, cmd/kafka3o/main.go
  - Do: `restore <cluster> <topic> [--from] [--to] [--partitions] [--wait]` parses the selection before anything is sent, confirms with the UI's wording (the selection, "the saved messages are appended to the topic, so messages still in it may be duplicated", "the topic's backup pauses until the restore finishes"), prints "Restore started for T from N stored objects." (plus skipped objects in another compression) and, without `--wait`, how to follow it; with `--wait` the progress until "Restore finished: N records restored." (exit 0) or the failure (exit 2). Refusals go through `backupError`.
  - Done when: `go test ./internal/cli/ -run RestoreCommand` passes covering everything, a selection, skipped objects, `--wait` to the end and to a failure, a running restore, an empty backup, cancel and Production.

## Review
