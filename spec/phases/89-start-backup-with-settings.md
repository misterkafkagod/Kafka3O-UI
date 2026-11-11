# P89 · F54-B2 — Start a backup with settings
- **Milestone:** M16
- **Covers:** F54-AC2
- **Discovery:** discovery/backup-settings-and-restore-filters.md
- **Status:** Building

## Demo
1. On a topic without a backup, open the Backup tab, choose "Messages from now on", zstd and 100 records per file, and start.
2. Expect the backup listed with those settings, and `.zst` objects holding only new messages within seconds of producing.
3. Enter 0 < records ≤ 1,000,000 rule violations (e.g. 2,000,000): the form names the field; a direct request with `compression: "lz4"` gets 400 `invalid_backup_settings` naming `compression`.

## Tasks
- [x] **T89.1 Gateway: validated backup settings** — Covers: F54-AC2
  - Files: Kafka3O-Gateway internal/backup/backup.go, internal/backup/validate_backup_options.go (new), internal/backup/validate_backup_options_test.go (new), internal/backup/backup_connector_config.go, internal/backup/backup_connector_config_test.go, internal/backup/start_backup.go, internal/backup/start_backup_test.go, internal/httpapi/register_start_backup.go, internal/httpapi/register_start_backup_test.go, internal/httpapi/new_backup_problem.go
  - Do: optional `settings {startFrom, compression, recordsPerFile}` in the start request; `ValidateBackupOptions` fills defaults and refuses other values with `ErrInvalidBackupSettings` naming the field (400 `invalid_backup_settings`); unknown fields refused; `BackupConnectorConfig` maps the options (no `file.max.records` when 0), so defaults equal the M13 configuration; validation happens before Connect.
  - Done when: `go test ./internal/backup/ ./internal/httpapi/ -run 'ValidateBackupOptions|BackupConnectorConfig|StartBackup|BackupStart'` passes covering defaults = M13 map, each option, each invalid field, unknown fields, and no Connect call on invalid input.
- [x] **T89.2 UI: Start form on the topic's Backup tab** — Covers: F54-AC2
  - Files: src/gateway/startBackup.ts, src/gateway/startBackup.test.ts, src/gateway/describeBackupError.ts, src/gateway/describeBackupError.test.ts, src/components/StartTopicBackup.tsx (new), src/components/StartTopicBackup.test.tsx (new), src/components/TopicBackup.tsx, src/components/TopicBackup.test.tsx, src/pages/TopicBackupPage.tsx, src/App.tsx
  - Do: `startBackup` sends `settings` when given; `StartTopicBackup` (shown with "No backup" when actions exist) has start point, compression and records-per-file fields with defaults, checks the record limit before sending, confirms, and reports start or error (`invalid_backup_settings` shows the Gateway's detail).
  - Done when: `npx vitest run src/gateway/startBackup src/gateway/describeBackupError src/components/StartTopicBackup src/components/TopicBackup` passes covering default and chosen settings in the request, an invalid record limit not sent, cancel sends nothing, and the Gateway's refusal shown.

## Review
