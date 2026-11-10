# P75 · F49-B1 — Start a topic backup
- **Milestone:** M13
- **Covers:** F49-AC1
- **Discovery:** [s3-backup-connectors](../discovery/s3-backup-connectors.md)
- **Status:** Done

## Demo
1. In the Gateway repository, run `go test ./internal/backup` and `go test ./internal/httpapi -run Backup`.
2. In the UI, open Kafka A's Backups tab, choose `kafka3o-m10-verify` and select "Start backup": the backup is created; starting it again is refused; Kafka B says backups are not configured.
3. On EKS-D after the user's `deploy.sh`: the connector `kafka3o-backup-kafka3o-m10-verify` runs on the test worker and an object appears under `kafka-a/kafka3o-m10-verify/` in the `kafka3o-backups` bucket within about a minute.

## Tasks
- [x] **T75.1 Backup configuration and connector creation in the Gateway** — Covers: F49-AC1
  - Files: Gateway internal/config/config.go, internal/config/validate_backup_config.go (new, with test), internal/config/load_config_test.go, internal/backup/backup.go (new, data types and errors), internal/backup/backup_connector_name.go (new, with test), internal/backup/backup_connector_config.go (new, with test), internal/backup/start_backup.go (new, with test), internal/backup/backup_location.go (new, with test), internal/connect/create_connector.go (new, with test), internal/connect/connector.go, internal/config/load_config.go
  - Do: An optional `backup` setting (`KAFKA3O_BACKUP__S3ENDPOINT`, `__BUCKET`, `__REGION`, `__PREFIX`) enables backups for the cluster; without it backups are not configured. `StartBackup.Execute(ctx, topic)` validates the topic name, names the connector `kafka3o-backup-<topic>`, and creates it through Connect (`POST /connectors`) with exactly the discovery recipe's sink configuration, the prefix `<prefix><topic>/`, and credentials referenced as `${env:BACKUP_S3_ACCESS_KEY}` and `${env:BACKUP_S3_SECRET_KEY}`. Connect 409 (already exists) → `ErrBackupExists`; other failures follow the M12 Connect error mapping.
  - Done when: `go test ./internal/backup ./internal/connect ./internal/config` (per package) passes, covering the generated configuration, the name, duplicates, not configured and Connect failures.
- [x] **T75.2 Start-backup route and authorization** — Covers: F49-AC1, write portion of F49-AC3
  - Files: Gateway internal/httpapi/register_start_backup.go (new, with test), internal/httpapi/new_backup_problem.go (new), internal/authorization/policy.go, internal/authorization/classify_action.go, internal/authorization/evaluate_policy_test.go, internal/gatewayauth/classify_route.go, internal/gatewayauth/route_actions.go, internal/gatewayauth/classify_route_test.go, cmd/gateway/gateway_routes.go, cmd/gateway/main.go, cmd/gateway/route_catalog_test.go, deploy/kubernetes/secured-test/deployment.yaml, deploy/kubernetes/secured-test/README.md
  - Do: `POST /api/v1/backups` with `{topic}` returns 201 `{topic, connector, location}`; 400 invalid topic, 404 `backups_not_configured`, 409 `backup_exists`, 503 Connect failures. The action `backups.start` is a Kafka write. The EKS-D manifest gives `gateway-a` the SeaweedFS endpoint, bucket `kafka3o-backups`, region `us-east-1` and prefix `kafka-a/`.
  - Done when: `go test ./internal/httpapi -run Backup`, `go test ./internal/gatewayauth`, `go test ./internal/authorization` and `go test ./cmd/gateway` pass; then `go test ./...` passes.
- [x] **T75.3 Backups tab with "Start backup"** — Covers: F49-AC1
  - Files: UI src/gateway/startBackup.ts (new, with test), src/gateway/describeBackupError.ts (new, with test), src/components/StartBackup.tsx (new, with test and styles), src/components/ClusterBackups.tsx (new, with test), src/components/ClusterTabs.tsx, src/components/ClusterTabs.test.tsx, src/components/AppShell.tsx, src/pages/ClusterPage.tsx, src/App.tsx, src/main.tsx
  - Do: Clusters get a Backups tab (`/clusters/<id>/backups`) with a "Start backup" form listing the cluster's topics; confirmation names the topic and storage location; success, "already backed up", "not configured", denials and Production cancellation each have their own message.
  - Done when: `npx vitest run src/gateway/startBackup.test.ts src/gateway/describeBackupError.test.ts src/components/StartBackup.test.tsx src/components/ClusterBackups.test.tsx` passes; then `npm test` (run on its own) and `npm run build` pass.

## Review
- **Demo:** steps 1–2 passed (auto-approved under the user's standing M13 instruction, 2026-11-10; run by Claude). Gateway: the generated connector configuration matches the s3-backup-connectors recipe (credentials only as `${env:...}` references), duplicates map to `backup_exists`, invalid topics and missing settings are refused before Connect, and the backup setting is validated (including `..` in the prefix, found by the test). UI in Chromium 1194 with a synthesized Gateway, 3/3: Start backup reports the storage location, a second start says "This topic is already backed up.", and Prod says backups are not configured. Step 3 (EKS-D) waits for a deploy: running `deploy.sh` without the user asking was blocked by the session's permission check.
- **Vulnerability scan:** not run; no dependency changes.
- **Regression:** Gateway `go test ./...` passed (25 operations in the route catalog); UI `npm test` 528 passed (5 opt-in skipped); default build.
- **Convention check:** one action per file in `internal/backup`; data types and errors in `backup.go`.

