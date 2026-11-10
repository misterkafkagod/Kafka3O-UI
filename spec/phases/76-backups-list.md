# P76 · F49-B2 — Backups section
- **Milestone:** M13
- **Covers:** F49-AC2
- **Discovery:** [s3-backup-connectors](../discovery/s3-backup-connectors.md)
- **Status:** Done

## Demo
1. In the Gateway repository, run `go test ./internal/s3store`, `go test ./internal/backup` and `go test ./internal/httpapi -run Backup`.
2. In the UI's Backups tab, the backups are listed with topic, state, storage location, last write and stored size; a failed backup shows its error; Kafka B says backups are not configured.
3. On EKS-D after deployment: Kafka A lists the `kafka3o-m10-verify` backup with its last write time.

## Tasks
- [x] **T76.1 Read-only S3 listing in the Gateway** — Covers: F49-AC2
  - Files: Gateway internal/s3store/object.go (new, data types), internal/s3store/sign_v4_request.go (new, with test), internal/s3store/list_objects.go (new, with test), internal/s3store/encode_uri_component.go and hmac_sha256.go (new, with tests), internal/config/validate_backup_config.go, internal/config/load_config.go, internal/config/config.go, internal/config/load_config_test.go
  - Do: AWS Signature Version 4 signing (standard library only), checked against AWS's published `get-vanilla` test vector; `ListObjects.Execute(ctx, prefix)` pages through ListObjectsV2 (path-style, `x-amz-content-sha256` of the empty body) and returns key, size and last-modified time. The Gateway's read-only credentials come only from `KAFKA3O_BACKUP_S3_ACCESS_KEY` and `KAFKA3O_BACKUP_S3_SECRET_KEY` (never from the config file); without them listings report "unknown".
  - Done when: `go test ./internal/s3store ./internal/config` (per package) passes, covering the test vector, paging, XML errors and HTTP errors.
- [x] **T76.2 List backups** — Covers: F49-AC2
  - Files: Gateway internal/backup/list_backups.go (new, with test), internal/backup/backup.go, internal/httpapi/register_list_backups.go (new, with test), internal/authorization/policy.go, internal/authorization/classify_action.go, internal/authorization/evaluate_policy_test.go, internal/gatewayauth/route_actions.go, internal/gatewayauth/classify_route_test.go, cmd/gateway/gateway_routes.go, cmd/gateway/main.go, cmd/gateway/route_catalog_test.go, deploy/kubernetes/secured-test/deployment.yaml and README.md (optional read-only Secret `kafka3o-backup-read`)
  - Do: `ListBackups` takes the Connect connectors named `kafka3o-backup-*`, adds each topic's state, error summary and location, and from the S3 listing its object count, stored bytes and last write (or unknown). `GET /api/v1/backups` returns `{backups}`; 404 `backups_not_configured`; Connect unreachable 503. The action `backups.list` is a cluster read.
  - Done when: `go test ./internal/backup`, `go test ./internal/httpapi -run Backup`, `go test ./internal/gatewayauth`, `go test ./internal/authorization` and `go test ./cmd/gateway` pass; then `go test ./...` passes.
- [x] **T76.3 Backups table** — Covers: F49-AC2
  - Files: UI src/gateway/listBackups.ts (new, with test), src/hooks/useBackups.ts (new), src/components/BackupList.tsx (new, with test and styles), src/components/ClusterBackups.tsx, src/components/ClusterBackups.test.tsx, src/components/StartBackup.tsx, src/pages/ClusterPage.tsx, src/App.tsx, src/main.tsx, src/groups/formatBytes.ts (new, with test), src/gateway/backupsNotConfigured.ts (new, with test)
  - Do: The Backups tab lists backups in a table (topic, state, location, last write, stored) with error summaries below failed rows, refreshes after a backup starts, says "Backups are not configured for this cluster" for 404, and offers Retry when Connect is unreachable.
  - Done when: `npx vitest run src/gateway/listBackups.test.ts src/components/BackupList.test.tsx src/components/ClusterBackups.test.tsx` passes; then `npm test` (on its own) and `npm run build` pass.

## Review
- **Demo:** steps 1–2 passed (auto-approved under the user's standing M13 instruction, 2026-11-10; run by Claude). Gateway: Signature V4 matches AWS's published `get-vanilla` vector; the listing pages, signs `x-amz-content-sha256` and reports HTTP, XML and timestamp failures; `ListBackups` keeps only `kafka3o-backup-*` sinks, marks a failed task as FAILED with its error, sums objects and bytes and takes the newest write, and reports storage as unknown without read credentials. UI in Chromium 1194 with a synthesized Gateway, 5/5: two backups with state, location, last write and size; a failed backup's error; no overflow at 320 px; Prod not configured. Step 3 (EKS-D) waits for a deploy and the read-only `kafka3o-backup-read` Secret.
- **Vulnerability scan:** not run; no dependency changes (the S3 client uses the Go standard library).
- **Regression:** Gateway `go test ./...` passed (26 operations in the route catalog); UI `npm test` 535 passed (5 opt-in skipped); default build.
- **Convention check:** the size formatter moved out of `BackupList` into `src/groups/formatBytes.ts`; Signature V4 helpers are their own files.

