# P98 · F59-B2 — Backup health
- **Milestone:** M17
- **Covers:** F59-AC2
- **Discovery:** —
- **Status:** Building

## Demo
1. Kafka A's Metrics tab: the Backups section lists `kafka3o-m10-verify` (and `tert`) with state, time since last write, stored size and whether a restore runs; each topic links to its Backup tab. Kafka B: "Backups are not configured for this cluster."
2. `/metrics` has `kafka3o_backup_up`, `kafka3o_backup_last_write_timestamp_seconds` and `kafka3o_backup_stored_bytes` per topic; scraping during a restore does not finish or remove it.

## Tasks
- [x] **T98.1 Gateway: backups section** — Covers: F59-AC2
  - Files: Kafka3O-Gateway internal/backup/backup.go, internal/backup/list_backups.go, internal/backup/list_backups_test.go, internal/metrics/metrics.go, internal/metrics/sources.go, internal/metrics/summarize_backups.go (new), internal/metrics/summarize_backups_test.go (new), internal/metrics/get_metrics.go, internal/metrics/get_metrics_test.go, internal/metrics/write_prometheus_text.go, internal/metrics/write_prometheus_text_test.go, cmd/gateway/main.go
  - Do: backups listed with a `restoring` flag whenever a restore connector exists (even without the restore check); `Sources.Backups` is a `ListBackups` built without the restore check or config reads, so metrics have no side effects; `SummarizeBackups` keeps topic, state, error, objects, stored bytes, last write and restoring; not configured → `notConfigured`; Prometheus `kafka3o_backup_up{topic}` (1 when RUNNING), `kafka3o_backup_restoring`, `kafka3o_backup_stored_bytes` and `kafka3o_backup_last_write_timestamp_seconds` when storage was listed.
  - Done when: `go test ./internal/backup/ ./internal/metrics/ -run 'ListBackups|Backups|GetMetrics|WritePrometheusText'` passes covering states, unknown storage, a running restore (no restore check called), not configured and unreachable.
- [ ] **T98.2 UI: backups section and CSV** — Covers: F59-AC2
  - Files: src/gateway/getMetrics.ts, src/components/BackupMetrics.tsx (new), src/components/BackupMetrics.test.tsx (new), src/components/ClusterMetrics.tsx, src/metrics/metricsToCsv.ts, src/metrics/metricsToCsv.test.ts
  - Do: table (topic linked to its Backup tab, state, last write with its age at the read time, stored, restore running), highlighting non-running backups; not configured / unavailable states; CSV rows per topic.
  - Done when: `npx vitest run src/components/BackupMetrics src/metrics/metricsToCsv` passes.

## Review
