# P77 · F49-B3 — Pause, resume and delete a backup
- **Milestone:** M13
- **Covers:** F49-AC3
- **Discovery:** —
- **Status:** Building

## Demo
1. In the Gateway repository, run `go test ./internal/backup`, `go test ./internal/connect` and `go test ./internal/httpapi -run Backup`.
2. In the Backups tab, pause and resume a backup and delete it, each after confirmation; the list follows; the delete confirmation says the stored data is kept; denials and unknown outcomes are explained.
3. On EKS-D after deployment: pausing, resuming and deleting the `kafka3o-m10-verify` backup changes its connector, and its objects remain in the bucket.

## Tasks
- [ ] **T77.1 Manage a backup in the Gateway** — Covers: F49-AC3
  - Files: Gateway internal/connect/connector.go, internal/connect/send_connect_action.go, internal/connect/send_connect_action_test.go, internal/backup/manage_backup.go (new, with test), internal/httpapi/register_backup_actions.go (new, with test), internal/authorization/policy.go, internal/authorization/classify_action.go, internal/authorization/evaluate_policy_test.go, internal/gatewayauth/classify_route.go, internal/gatewayauth/route_actions.go, internal/gatewayauth/classify_route_test.go, cmd/gateway/gateway_routes.go, cmd/gateway/main.go, cmd/gateway/route_catalog_test.go
  - Do: The Connect action client gains `delete` (`DELETE /connectors/{name}`, 204). `ManageBackup.Execute(ctx, topic, kind)` validates the topic and sends pause, resume or delete to `kafka3o-backup-<topic>`; deleting never touches storage. Routes `POST /api/v1/backups/{topic}/pause`, `/resume` (202) and `DELETE /api/v1/backups/{topic}` (202); 404 `not_found` for a topic without a backup. The actions `backups.pause`, `backups.resume`, `backups.delete` are Kafka writes.
  - Done when: `go test ./internal/connect`, `go test ./internal/backup`, `go test ./internal/httpapi -run Backup`, `go test ./internal/gatewayauth`, `go test ./internal/authorization` and `go test ./cmd/gateway` pass; then `go test ./...` passes.
- [ ] **T77.2 Backup actions in the Backups tab** — Covers: F49-AC3
  - Files: UI src/gateway/runBackupAction.ts (new, with test), src/gateway/startBackup.ts, src/gateway/describeBackupError.ts, src/gateway/describeBackupError.test.ts, src/components/BackupList.tsx, src/components/BackupList.test.tsx, src/components/ClusterBackups.tsx, src/main.tsx
  - Do: Each backup row gets Pause (or Resume when paused) and Delete. Confirmations name the topic; the delete confirmation states that stored objects are kept. After a request the list refreshes immediately and after 3 seconds; canceling sends nothing; failures use the backup messages.
  - Done when: `npx vitest run src/gateway/runBackupAction.test.ts src/gateway/describeBackupError.test.ts src/components/BackupList.test.tsx` passes; then `npm test` (on its own) and `npm run build` pass.

## Review
