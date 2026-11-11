# P91 · F55-B1 — Restore everything from the topic
- **Milestone:** M16
- **Covers:** F55-AC1, F55-AC3
- **Discovery:** discovery/backup-settings-and-restore-filters.md
- **Status:** Done

## Demo
1. Start a zstd backup of a test topic from its Backup tab and produce a few messages.
2. Click Restore, confirm: the backup pauses, "Restoring n of m records." follows, the restore finishes on its own and the backup resumes.
3. The restored copies keep key, value, headers and timestamp plus `kafka3o-restore`; the backup does not save them again.

## Tasks
- [x] **T91.1 Gateway: read every backup compression** — Covers: F55-AC3
  - Files: Kafka3O-Gateway go.mod, internal/backup/parse_backup_object_name.go, internal/backup/parse_backup_object_name_test.go, internal/backup/backup_object_compression.go (new), internal/backup/backup_object_compression_test.go (new), internal/backup/open_backup_object.go (new), internal/backup/open_backup_object_test.go (new), internal/backup/xerial_snappy_reader.go (new), internal/backup/xerial_snappy_reader_test.go (new), internal/backup/count_object_records.go, internal/backup/count_object_records_test.go
  - Do: object names may end in `.gz`, `.zst`, `.snappy` or nothing; `BackupObjectCompression` maps the name to gzip/zstd/snappy/none; `OpenBackupObject` decompresses by that compression (klauspost `zstd`, xerial snappy stream with `snappy` block decode, gzip, plain); `CountObjectRecords` uses it; a corrupt object is a storage error.
  - Done when: `go test ./internal/backup/ -run 'ParseBackupObjectName|BackupObjectCompression|OpenBackupObject|XerialSnappy|CountObjectRecords'` passes with fixtures for each compression (the snappy fixture built in the xerial layout seen in the discovery) and corrupt input.
- [x] **T91.2 Gateway: restore with the backup's compression** — Covers: F55-AC1, F55-AC3
  - Files: internal/backup/backup.go, internal/backup/snapshot_boundary.go, internal/backup/snapshot_boundary_test.go, internal/backup/restore_connector_config.go, internal/backup/restore_connector_config_test.go, internal/backup/start_restore.go, internal/backup/start_restore_test.go, internal/backup/check_restore.go, internal/backup/check_restore_test.go, cmd/gateway/main.go
  - Do: the restore's compression is the backup job's `file.compression.type` (default gzip), or, without a job, the newest object's; the snapshot holds only objects of that compression and `Restore.skipped` counts the others; the source config uses that compression and template extension; `CheckRestore` counts only objects of the restore's `file.compression.type`.
  - Done when: `go test ./internal/backup/ -run 'SnapshotBoundary|RestoreConnectorConfig|StartRestore|CheckRestore'` passes covering zstd and none restores, mixed compressions (skipped, and finish not blocked), and the gzip default identical to M13.
- [x] **T91.3 Restore transform: every extension** — Covers: F55-AC3
  - Files: connect-plugins/kafka3o-restore-transform/pom.xml, src/main/java/dev/kafka3o/connect/BackupObjectKey.java, src/test/java/dev/kafka3o/connect/BackupObjectKeyTest.java, README.md
  - Do: object names may end in `.gz`, `.zst`, `.snappy` or nothing; version 1.1.0.
  - Done when: `mvn -B verify` passes with the new name cases.
- [x] **T91.4 UI: Restore on the topic's Backup tab** — Covers: F55-AC1
  - Files: src/gateway/startRestore.ts, src/gateway/startRestore.test.ts, src/components/TopicRestore.tsx (new), src/components/TopicRestore.test.tsx (new), src/components/TopicBackup.tsx, src/components/TopicBackup.test.tsx
  - Do: Restore button (disabled while a restore runs) with the F50 confirmation; notice names the stored objects and, when `skipped > 0`, says that many older objects in another compression are not restored; progress follows through `useBackups` polling.
  - Done when: `npx vitest run src/gateway/startRestore src/components/TopicRestore src/components/TopicBackup` passes covering start, skipped notice, cancel, a running restore disabling the button, and errors.

## Review
- **Demo:** unit tests cover zstd, snappy (including a real sink object from the discovery) and uncompressed reading, compression-aware snapshots and finishing, and the topic tab's restore; the live restore runs with the milestone deploy, which installs transform 1.1.0 (auto-approval, 2026-11-11)
- **Tests:** Gateway `go test ./...` passed; transform `mvn -B verify` 9 tests passed; UI 620 passed (5 skipped); `tsc -b` clean
- **Conventions:** one action per file (`BackupObjectCompression`, `OpenBackupObject`, `XerialSnappyReader` with its single `Read`, `TopicRestore`)
- **Vulnerability scan:** `govulncheck@v1.9.0 ./...`: 0 called, 1 uncalled in required modules (unchanged); `klauspost/compress` v1.20.3 moved from indirect to direct, no advisory
- **Notes:** objects of an earlier backup written with another compression are not restored; the restore notice says how many.

