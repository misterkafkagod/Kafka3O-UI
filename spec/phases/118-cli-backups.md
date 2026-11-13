# P118 · F67-B3 — Backups across clusters
- **Milestone:** M21
- **Covers:** F67-AC3
- **Discovery:** —
- **Status:** Building

## Demo
1. `kafka3o backups`: the `kafka3o-m10-verify` backup (and any other on Kafka A) with state, last write, stored size, settings and restore; Kafka B says "Backups are not configured for this cluster." (or lists its backups) without failing.
2. `kafka3o backups -o json`: the same per cluster, with `notConfigured` and the failures; `kafka3o topic kafka-a kafka3o-m10-verify` still shows the same backup texts.

## Tasks
- [x] **T118.1 Backups across clusters** — Covers: F67-AC3
  - Files: Kafka3O-cli internal/backups/backup.go (new), internal/backups/list_backups.go (new), internal/backups/list_backups_test.go (new), internal/backups/compare_backups.go (new)
  - Do: `ListBackups` reads `/api/v1/backups` on the chosen or every accessible cluster through `clusters.ReadAcrossClusters`; `backups_not_configured` becomes `NotConfigured` (not a failure); backups are sorted by topic. `Backup` carries cluster, topic, connector, `restoring` and embeds `topics.BackupSnapshot` (state, error, location, storage, settings, restore), so the JSON keeps the Gateway's names.
  - Done when: `go test ./internal/backups/` passes covering sorting, a not-configured cluster, a failing cluster and a signed-out session.
- [x] **T118.2 `kafka3o backups`** — Covers: F67-AC3
  - Files: internal/cli/new_backups_command.go (new), internal/cli/new_backups_command_test.go (new), internal/cli/describe_backup_settings.go (new), internal/cli/describe_backup_restore.go (new), internal/cli/describe_last_write.go (new), internal/cli/write_topic_view.go, cmd/kafka3o/main.go
  - Do: `backups [--cluster]` prints `CLUSTER TOPIC STATE LAST WRITE STORED SETTINGS RESTORE`, then an "Errors" list for failed backups and restores, then one line per not-configured cluster (storage that could not be listed reads "unavailable"; texts terminal-escaped); failures on stderr with exit 2; `-o json` prints `{clusters:[{cluster, notConfigured, backups}], failures}`; "No backups." when none. The settings, restore and last-write texts move out of `write_topic_view.go` into the three describers, which both commands use.
  - Done when: `go test ./internal/cli/ -run 'BackupsCommand|TopicCommand'` passes covering the table, a running restore, a failed backup, a not-configured cluster, JSON and a failing cluster, with the topic view unchanged.

## Review
