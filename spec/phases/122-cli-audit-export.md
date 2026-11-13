# P122 · F68-B2 — Audit export
- **Milestone:** M22
- **Covers:** F68-AC2
- **Discovery:** —
- **Status:** Building

## Demo
1. `kafka3o audit export --cluster kafka-a --from 2026-11-13T00:00:00-03:00 --file <scratch>/audit.csv` prints "Wrote N events to …" and the file (mode 0600) starts with the Console's CSV header; running it again refuses to overwrite.
2. Without `--file` the CSV goes to standard output unchanged; `--outcome maybe` is refused before sending.

## Tasks
- [x] **T122.1 Download the audit CSV** — Covers: F68-AC2
  - Files: Kafka3O-cli internal/console/get_csv.go (new), internal/console/get_csv_test.go (new), internal/audit/export_audit_events.go (new), internal/audit/export_audit_events_test.go (new)
  - Do: `GetCSV` is `GetJSON`'s twin for `text/csv` answers (session cookies, 401 → signed out, problems parsed, a non-CSV success refused); `ExportAuditEvents` reads `/api/audit/export?…` (the filters without limit and cursor) and returns the bytes unchanged with the number of events (CSV records minus the header).
  - Done when: `go test ./internal/console/ ./internal/audit/ -run 'GetCSV|ExportAuditEvents'` passes covering the cookies and Accept header, 401, a problem, a wrong content type, quoted multi-line cells in the count, and the path.
- [x] **T122.2 `kafka3o audit export`** — Covers: F68-AC2
  - Files: internal/cli/new_audit_export_command.go (new), internal/cli/new_audit_export_command_test.go (new), internal/cli/new_audit_command.go, cmd/kafka3o/main.go
  - Do: `audit export [--cluster] [--actor] [--action] [--outcome] [--from] [--until] [--file F]` writes the CSV to standard output, or creates F (mode 0600, never overwriting) and prints "Wrote N events to F." on stderr; refusals go through `adminError`.
  - Done when: `go test ./internal/cli/ -run AuditExportCommand` passes covering stdout, a new file and its mode, an existing file, a denied scope and a bad filter.

## Review
