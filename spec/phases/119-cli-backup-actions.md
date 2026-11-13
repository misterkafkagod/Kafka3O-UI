# P119 · F67-B4 — Start, pause, resume and delete a backup
- **Milestone:** M21
- **Covers:** F67-AC4
- **Discovery:** —
- **Status:** Done

## Demo
1. Create `kafka3o-cli-p119` on Kafka A; `kafka3o backup start kafka-a kafka3o-cli-p119 --start-from latest --compression zstd --records-per-file 500` shows the settings, asks, and prints "Backup started for kafka3o-cli-p119. Messages are stored in s3://…"; `backups` shows it with those settings; a second start reads "This topic is already backed up."
2. `backup pause`, `backup resume` and `backup delete` (each confirmed) are seen in `backups`; delete says the stored objects are kept; `--compression lz4` is refused before sending; the topic is deleted afterwards.

## Tasks
- [x] **T119.1 Start a backup and run backup actions** — Covers: F67-AC4
  - Files: Kafka3O-cli internal/backups/backup_settings.go (new), internal/backups/validate_backup_settings.go (new), internal/backups/validate_backup_settings_test.go (new), internal/backups/start_backup.go (new), internal/backups/start_backup_test.go (new), internal/backups/run_backup_action.go (new), internal/backups/run_backup_action_test.go (new), internal/backups/fake_send_test.go (new)
  - Do: `ValidateBackupSettings` mirrors the Gateway (start point earliest|latest, compression gzip|zstd|snappy|none, records per file 0–1,000,000; empty = default). `StartBackup` posts `{topic[, settings]}` to `/api/v1/backups` with only the chosen fields (no `settings` without flags) and requires the created backup's topic. `RunBackupAction` posts `…/backups/{topic}/pause|resume` or sends `DELETE …/backups/{topic}` (topic path-escaped) and requires the `{topic, action}` echo; a mismatch is "may have been applied".
  - Done when: `go test ./internal/backups/ -run 'ValidateBackupSettings|StartBackup|RunBackupAction'` passes covering each invalid setting, the body with and without settings, the three actions, the echo check and the reason.
- [x] **T119.2 `kafka3o backup start|pause|resume|delete`** — Covers: F67-AC4
  - Files: internal/cli/new_backup_command.go (new), internal/cli/new_backup_command_test.go (new), internal/cli/run_backup_change.go (new), internal/cli/backup_error.go (new), internal/cli/backup_error_test.go (new), cmd/kafka3o/main.go
  - Do: `backup start <cluster> <topic> [--start-from] [--compression] [--records-per-file]` validates the topic name and settings before anything is sent and shows the effective settings (defaults filled in) in the confirmation; `pause|resume|delete <cluster> <topic>` use the UI's confirmations and results (delete: "The backup job for T was deleted. Its stored objects are kept."); `backupError` is a port of the UI's describeBackupError (backup_exists, not_found, restore_in_progress, nothing_to_restore, backups_not_configured, invalid settings or selection) with `writeError` for denials, unreachable clusters and the rest.
  - Done when: `go test ./internal/cli/ -run 'BackupCommand|BackupError'` passes covering start with and without settings, invalid settings, each action, an existing backup, a missing backup, cancel, Production and exit 4.

## Review
- **Demo:** live on EKS-D as admin on `kafka3o-cli-p119` (auto-approval, 2026-11-13): `--compression lz4` was refused before sending; `backup start … --start-from latest --compression zstd --records-per-file 500` showed those settings, asked, and printed "Backup started for kafka3o-cli-p119. Messages are stored in s3://kafka3o-backups/kafka-a/kafka3o-cli-p119/."; `backups` showed it RUNNING with "messages from when the backup started, zstd, up to 500 records per file" and nothing written; a second start read "refused: This topic is already backed up."; pause → PAUSED, resume → RUNNING; delete printed "The backup job for kafka3o-cli-p119 was deleted. Its stored objects are kept." and it left the list; deleting again read "topic kafka3o-cli-p119 has no backup on kafka-a"; `start kafka-b … --yes` sent nothing without a reason; the topic was deleted
- **Tests:** `go test -race ./...` passed
- **Conventions:** `ValidateBackupSettings`, `StartBackup`, `RunBackupAction`, `backupError` (port of the UI's describeBackupError) and the shared `runBackupChange` are single actions; `backup_settings.go` holds data types and constants only
- **Vulnerability scan:** not needed (no dependency change)
- **Notes:** the deleted sink left an empty consumer group `connect-kafka3o-backup-kafka3o-cli-p119` (no topics, no offsets); the Gateway has no route to delete groups, so it stays like the earlier probe groups. Nothing was stored, because the backup started from "latest" and nothing was produced.
