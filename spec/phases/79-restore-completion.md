# P79 · F50-B2 — Restore progress and completion
- **Milestone:** M13
- **Covers:** F50-AC3
- **Discovery:** [s3-backup-connectors](../discovery/s3-backup-connectors.md)
- **Status:** Done

## Demo
1. In the Gateway repository, run `go test ./internal/s3store`, `go test ./internal/connect`, `go test ./internal/kafka -run ConnectOffsets` and `go test ./internal/backup`.
2. In the Backups tab, a running restore shows "Restoring N of M records"; when every snapshot object is fully restored, the next refresh removes the restore, resumes the backup it paused and shows "Last restore finished"; a failed restore shows its error and keeps the backup paused.
3. On EKS-D after deployment: restoring `kafka3o-m10-verify` finishes on its own, the backup resumes and saves no restored records; the audit lists the restore and its outcome.

## Tasks
- [x] **T79.1 Count backup records** — Covers: F50-AC3
  - Files: Gateway internal/s3store/get_object.go (new, with test), internal/backup/count_object_records.go (new, with test)
  - Do: `GetObject` streams one object with Signature V4. `CountObjectRecords` gunzips an object and counts its jsonl lines, caching the count by object key and size (backup objects never change), with a bounded cache.
  - Done when: `go test ./internal/s3store ./internal/backup` (per package) passes, covering the stream, gzip errors and cache hits.
- [x] **T79.2 Read restore offsets and connector configuration** — Covers: F50-AC3
  - Files: Gateway internal/connect/fetch_connector_config.go (new, with test), internal/kafka/read_connect_offsets.go (new), internal/kafka/apply_connect_offset_record.go (new, with test; the reading loop needs a broker and is checked live), internal/backup/read_restore_offsets.go (new, interface), internal/config/load_config.go, internal/config/config.go, internal/config/load_config_test.go
  - Do: `FetchConnectorConfig` reads `GET /connectors/{name}/config` (never returned to the browser). `ReadConnectOffsets` reads the Connect offsets topic (`connect.offsetstopic`, default `kafka3o-connect-offsets`) from start to end and returns the latest `recordCount` per object key for one connector, ignoring other connectors and tombstones.
  - Done when: `go test ./internal/connect`, `go test ./internal/kafka -run ConnectOffsets` and `go test ./internal/config` pass.
- [x] **T79.3 Restore status and automatic finish** — Covers: F50-AC3
  - Files: Gateway internal/backup/check_restore.go (new, with test; named after its action), internal/backup/parse_backup_object_name.go and parse_snapshot_boundary.go (new, shared with the snapshot; with tests), internal/backup/first_non_empty.go (new, with test), internal/backup/snapshot_boundary.go, internal/kafka/read_connect_offsets.go (5 s read limit), internal/backup/list_backups.go, internal/backup/list_backups_test.go, internal/backup/backup.go, cmd/gateway/main.go
  - Do: For a topic with a restore connector, the status combines the restore's state, its snapshot boundary and restore ID from the connector configuration, each snapshot object's record count and committed `recordCount`. When the connector is running and every snapshot object is fully restored, the list deletes the restore connector and resumes the backup if the restore paused it; a failed restore stays visible with its error and the backup stays paused. Each backup in `GET /api/v1/backups` carries `restore: {restoreId, state, restored, total, finished, error}` when one is running or has just finished.
  - Done when: `go test ./internal/backup` passes, covering in-progress, completion (connector deleted, backup resumed or left paused), failure and an unreadable offsets topic; then `go test ./...` passes.
- [x] **T79.4 Restore progress in the Backups tab** — Covers: F50-AC3
  - Files: UI src/gateway/listBackups.ts, src/hooks/useBackups.ts, src/components/BackupList.tsx, src/components/BackupList.module.css, src/components/BackupList.test.tsx, src/components/ClusterBackups.test.tsx
  - Do: A backup with a restore shows "Restoring N of M records" (or the restore's error, or "Last restore finished"); Restore is disabled while one runs; the tab refreshes every 5 seconds while a restore runs.
  - Done when: `npx vitest run src/components/BackupList.test.tsx src/components/ClusterBackups.test.tsx` passes; then `npm test` (on its own) and `npm run build` pass.

## Review
- **Demo:** steps 1–2 passed (auto-approved under the user's standing M13 instruction, 2026-11-10; run by Claude). Gateway: object streaming and cached record counting (gzip errors, cache hits); the Connect offsets parser keeps the latest `recordCount` per object for one connector and honors tombstones; `CheckRestore` counts only snapshot objects, reports progress, finishes a complete running restore (deletes it, resumes the backup only if the restore paused it), leaves failed restores and backups alone, and reports unreadable offsets as an error; the list shows restores whose backup job was deleted. UI in Chromium 1194 with a synthesized Gateway, 3/3: progress shown, the tab refreshes every 5 s while a restore runs, and stops once it finished. The reading loop over the offsets topic needs a broker and is checked live. Step 3 (EKS-D) waits for a deploy.
- **Regression:** Gateway `go test ./...` passed; UI `npm test` 543 passed (5 opt-in skipped); default build.
- **Convention check:** one action per file (`check_restore`, `count_object_records`, `parse_backup_object_name`, `parse_snapshot_boundary`, `apply_connect_offset_record`, `read_connect_offsets`, `fetch_connector_config`, `get_object`).
- **Vulnerability scan (milestone close):** `npm audit`: 0; `govulncheck@v1.9.0`: 0 called, 1 uncalled (GO-2026-5932, unchanged); restore transform (`osv-scanner@v2.7.0`): 0 after moving to connect-api 4.3.2 (4.3.1's kafka-clients brought high lz4-java and snappy-java advisories; the jar bundles none of them). **Aiven S3 sink and source 3.4.3** (the latest release; 114 bundled artifacts checked against osv.dev by their own `pom.properties`): **4 critical** (netty-handler 4.1.115, avro 1.11.0/1.11.3, parquet-avro 1.15.0) and **41 high** (jackson-core/databind 2.13–2.14, netty codec/http/http2/handler 4.1.115, guava 30.1.1, commons-beanutils 1.9.4, dnsjava 3.4.0, aircompressor 2.0.2, nimbus-jose-jwt 9.31, plexus-utils 3.5.1). This violates the CVE policy and blocks M13's close until the user chooses a fix or an exception.

