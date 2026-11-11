# P92 · F55-B2 — Restore a time range or chosen partitions
- **Milestone:** M16
- **Covers:** F55-AC2
- **Discovery:** discovery/backup-settings-and-restore-filters.md
- **Status:** Building

## Demo
1. On a backed-up test topic's Backup tab choose "Only some messages", partition 0 and a time range covering part of its messages, and confirm.
2. Expect only those records appended (with `kafka3o-restore`), progress shown, and the restore finishing on its own.
3. A start after its end, an empty or unknown partition is refused with a message, and nothing is sent to Connect.

## Tasks
- [x] **T92.1 Restore transform: time window** — Covers: F55-AC2
  - Files: connect-plugins/kafka3o-restore-transform/src/main/java/dev/kafka3o/connect/UnwrapBackupRecord.java, src/main/java/dev/kafka3o/connect/TimeWindow.java (new), src/test/java/dev/kafka3o/connect/UnwrapBackupRecordTest.java, src/test/java/dev/kafka3o/connect/TimeWindowTest.java (new), README.md
  - Do: optional `time.from` / `time.to` (epoch ms, `[from, to)`); records outside are dropped after unwrapping; invalid or reversed values fail `configure`.
  - Done when: `mvn -B verify` passes covering inside, outside, the bounds, only-from, only-to and invalid windows.
- [ ] **T92.2 Gateway: restore filters** — Covers: F55-AC2
  - Files: Kafka3O-Gateway internal/backup/backup.go, internal/backup/restore_filter.go (new), internal/backup/validate_restore_filter.go (new), internal/backup/validate_restore_filter_test.go (new), internal/backup/scan_object_records.go (new, replaces count_object_records.go), internal/backup/scan_object_records_test.go (new, replaces count_object_records_test.go), internal/backup/start_restore.go, internal/backup/start_restore_test.go, internal/backup/restore_connector_config.go, internal/backup/restore_connector_config_test.go, internal/backup/check_restore.go, internal/backup/check_restore_test.go, internal/httpapi/register_start_restore.go, internal/httpapi/register_start_restore_test.go, internal/httpapi/new_backup_problem.go, cmd/gateway/main.go
  - Do: the restore request takes optional `from`, `to` (RFC 3339) and `partitions`; `ValidateRestoreFilter` refuses a start not before the end, an empty or negative partition list (`ErrInvalidRestoreFilter`, 400 `invalid_restore_filter`); partitions without stored objects of the restore's compression are refused; the snapshot boundary keeps only chosen partitions; the source config carries `transforms.unwrap.time.from/to`; `ScanObjectRecords` returns per object the lines in the window and the line number of the last one (cached by key, size and window); `CheckRestore` expects each object's last matching line, skips objects without one, and counts restored records per finished object.
  - Done when: `go test ./internal/backup/ ./internal/httpapi/ -run 'RestoreFilter|ScanObjectRecords|StartRestore|RestoreConnectorConfig|CheckRestore|BackupRestore'` passes covering partitions only, window only, both, a window matching nothing (finishes at once), objects whose last line is outside, and each refusal before Connect.
- [ ] **T92.3 UI: restore options** — Covers: F55-AC2
  - Files: src/gateway/startRestore.ts, src/gateway/startRestore.test.ts, src/gateway/describeBackupError.ts, src/gateway/describeBackupError.test.ts, src/components/TopicRestore.tsx, src/components/TopicRestore.test.tsx, src/components/readRestoreFilter.ts (new), src/components/readRestoreFilter.test.ts (new), src/main.tsx
  - Do: "Everything" or "Only some messages" with from/to (`datetime-local`, local time, sent as UTC ISO) and partitions (comma-separated); `readRestoreFilter` validates before sending; the confirmation names the selection; the Gateway's refusal is shown.
  - Done when: `npx vitest run src/gateway/startRestore src/gateway/describeBackupError src/components/TopicRestore src/components/readRestoreFilter` passes covering everything, partitions only, window only, both, reversed window and bad partitions not sent.

## Review
