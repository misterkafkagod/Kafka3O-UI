# P78 · F50-B1 — Restore transform and starting a restore
- **Milestone:** M13
- **Covers:** F50-AC1, F50-AC2
- **Discovery:** [s3-backup-connectors](../discovery/s3-backup-connectors.md)
- **Status:** Building

## Demo
1. In the Gateway repository, run `mvn -B verify` in `connect-plugins/kafka3o-restore-transform` and `go test ./internal/backup ./internal/httpapi -run Restore` (per package).
2. In the Backups tab, "Restore" asks for a confirmation that states the messages are appended and may duplicate existing ones; confirming starts the restore; canceling sends nothing; a second restore of the same topic is refused.
3. On EKS-D after deployment and installing the plugin: restoring the `kafka3o-m10-verify` backup pauses its backup and appends the saved messages with their keys, headers and timestamps plus `kafka3o-restore`; objects written after the restore started are not restored.

## Tasks
- [x] **T78.1 Restore transform plugin** — Covers: F50-AC1, F50-AC2
  - Files: Gateway connect-plugins/kafka3o-restore-transform/pom.xml (new), …/src/main/java/dev/kafka3o/connect/UnwrapBackupRecord.java (new), …/src/main/java/dev/kafka3o/connect/BackupObjectKey.java (new, parses `<topic>-<partition>-<start offset>.gz`), …/src/main/java/dev/kafka3o/connect/SnapshotBoundary.java (new, parses `partition:offset,…`), matching tests under src/test/java (new), connect-plugins/kafka3o-restore-transform/README.md (new)
  - Do: The transformation turns one backup line (base64 key, value and header values, ISO timestamp) into the original record with ByteArray schemas, the original partition and timestamp, and adds header `kafka3o-restore: <restore.id>`; records whose source object is outside `snapshot.boundary` (unknown partition or a start offset above the partition's boundary) are dropped. Malformed lines fail with a DataException naming the object. Java 21, connect-api 4.3.1 provided, JUnit 6.1.3.
  - Done when: `mvn -B verify` passes, covering keys, null values, headers, timestamps, the marker, snapshot filtering and malformed input.
- [ ] **T78.2 Start a restore in the Gateway** — Covers: F50-AC1, F50-AC2, write portion of F50-AC3
  - Files: Gateway internal/backup/restore_connector_name.go (new, with test), internal/backup/restore_connector_config.go (new, with test), internal/backup/snapshot_boundary.go (new, with test), internal/backup/start_restore.go (new, with test), internal/backup/backup.go, internal/httpapi/register_start_restore.go (new, with test), internal/httpapi/new_backup_problem.go, internal/authorization/policy.go, internal/authorization/classify_action.go, internal/authorization/evaluate_policy_test.go, internal/gatewayauth/route_actions.go, internal/gatewayauth/classify_route_test.go, cmd/gateway/gateway_routes.go, cmd/gateway/main.go, cmd/gateway/route_catalog_test.go
  - Do: `StartRestore.Execute(ctx, topic)` lists the topic's backup objects (refusing when there are none), computes the snapshot boundary, pauses the topic's backup if it exists, and creates `kafka3o-restore-<topic>` with the recipe's source configuration, the transform's restore ID and boundary, and a note whether the backup must be resumed. A second restore of the topic is refused (`restore_in_progress`). `POST /api/v1/backups/{topic}/restore` returns 202 `{topic, restoreId, objects}`; the action `backups.restore` is a Kafka write.
  - Done when: `go test ./internal/backup`, `go test ./internal/httpapi -run Restore`, `go test ./internal/gatewayauth`, `go test ./internal/authorization` and `go test ./cmd/gateway` pass; then `go test ./...` passes.
- [ ] **T78.3 Restore from the Backups tab** — Covers: F50-AC1
  - Files: UI src/gateway/startRestore.ts (new, with test), src/gateway/startBackup.ts, src/gateway/describeBackupError.ts, src/gateway/describeBackupError.test.ts, src/components/BackupList.tsx, src/components/BackupList.test.tsx, src/main.tsx
  - Do: Each backup row gets Restore. The confirmation names the topic and cluster and states that the saved messages are appended to the topic, may duplicate messages still there, and that the topic's backup pauses until the restore finishes. Success shows "Restore started for <topic>"; `restore_in_progress` and `nothing_to_restore` have their own messages.
  - Done when: `npx vitest run src/gateway/startRestore.test.ts src/gateway/describeBackupError.test.ts src/components/BackupList.test.tsx` passes; then `npm test` (on its own) and `npm run build` pass.

## Review
