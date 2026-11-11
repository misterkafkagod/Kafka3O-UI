# P88 · F54-B1 — Topic Backup tab
- **Milestone:** M16
- **Covers:** F54-AC1
- **Discovery:** discovery/backup-settings-and-restore-filters.md
- **Status:** Review

## Demo
1. Open `kafka3o-m10-verify` on Kafka A and choose the Backup tab.
2. Expect its backup with state, location, last write, stored size and settings (from the oldest message, gzip, unlimited records per file).
3. Open a topic without a backup: "No backup for this topic." Kafka B: "Backups are not configured for this cluster."

## Tasks
- [x] **T88.1 Gateway: effective backup settings in the list** — Covers: F54-AC1
  - Files: Kafka3O-Gateway internal/backup/backup.go, internal/backup/read_backup_options.go (new), internal/backup/read_backup_options_test.go (new), internal/backup/list_backups.go, internal/backup/list_backups_test.go, cmd/gateway/main.go
  - Do: `BackupOptions{StartFrom, Compression, RecordsPerFile}` (json `settings`, omitted when unread); `ReadBackupOptions(config)` maps only `consumer.override.auto.offset.reset` (default earliest), `file.compression.type` (default gzip) and `file.max.records` (default 0, unparsable → 0); `ListBackups` takes a `connect.FetchConnectorConfig` and fills settings per existing backup job; a failed read leaves settings out without failing the list.
  - Done when: `go test ./internal/backup/ -run 'ReadBackupOptions|ListBackups'` passes covering defaults, each key, a failed config read and "NO JOB" backups without settings.
- [x] **T88.2 UI: topic Backup tab** — Covers: F54-AC1
  - Files: src/gateway/listBackups.ts, src/components/TopicTabs.tsx, src/components/TopicTabs.test.tsx, src/components/TopicBackup.tsx (new), src/components/TopicBackup.test.tsx (new), src/components/describeBackupSettings.ts (new), src/components/describeBackupSettings.test.ts (new), src/pages/TopicBackupPage.tsx (new), src/App.tsx
  - Do: `TopicBackup` reads `useBackups`, selects the topic's backup, and shows state (and error), location, last write, stored size, settings via `describeBackupSettings`, and the running restore line; "No backup for this topic."; not-configured and Connect-unreachable states as on the cluster tab; `TopicBackupPage` renders tabs + `TopicBackup` at `/clusters/:id/topics/:topic/backup`; TopicTabs gains "Backup".
  - Done when: `npx vitest run src/components/TopicBackup src/components/describeBackupSettings src/components/TopicTabs` passes covering running, paused, failed, missing, not-configured and unknown-settings cases.

## Review
