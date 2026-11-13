# P106 · F63-B2 — Metrics and their export
- **Milestone:** M19
- **Covers:** F63-AC2
- **Discovery:** —
- **Status:** Done

## Demo
1. `kafka3o metrics kafka-a`: partition health, controller quorum, disk use, leaders per broker, consumer groups, Kafka Connect, backups and largest topics; an unavailable section says why.
2. `kafka3o metrics kafka-a -o json` is the Gateway's metrics document; `-o csv` has the header `metric,broker,logDir,topic,name,value` and the same rows as the UI's CSV download.

## Tasks
- [x] **T106.1 Metrics read and the UI's CSV** — Covers: F63-AC2
  - Files: Kafka3O-cli internal/metrics/cluster_metrics.go (new), internal/metrics/read_metrics.go (new), internal/metrics/read_metrics_test.go (new), internal/metrics/metrics_to_csv.go (new), internal/metrics/metrics_to_csv_test.go (new), internal/metrics/escape_csv_field.go (new), internal/metrics/escape_csv_field_test.go (new)
  - Do: `ReadMetrics` reads `/api/v1/metrics` once and returns both the raw document (for JSON output, unchanged) and its typed form (numbers kept as `json.Number`, times as the strings sent); `MetricsToCSV` is a port of the UI's `metricsToCsv` (same rows, order, empty unknown values, CRLF); `EscapeCSVField` quotes like the UI.
  - Done when: `go test ./internal/metrics/` passes using the UI's metricsToCsv test expectations (log dirs including an unknown and a failed one, unknown below-min-ISR, quorum, brokers, groups with a partly unknown lag and a comma in a name, Connect, backups).
- [x] **T106.2 `kafka3o metrics <cluster>`** — Covers: F63-AC2
  - Files: internal/metrics/write_metrics_text.go (new), internal/metrics/write_metrics_text_test.go (new), internal/cli/output_format.go, internal/cli/output_format_test.go, internal/cli/new_metrics_command.go (new), internal/cli/new_metrics_command_test.go (new), cmd/kafka3o/main.go
  - Do: text sections as in the UI (each saying "Unavailable: <reason>" or "not configured"); `-o json` writes the raw document; `-o csv` the CSV (only this command accepts `csv`); an unreachable cluster exits 2, an unknown one 1.
  - Done when: `go test ./internal/metrics/ ./internal/cli/ -run 'Metrics|OutputFormat'` passes covering the text, JSON passed through unchanged, CSV, csv refused by other commands, and the failures.

## Review
- **Demo:** tests cover both demo steps with a fake Console: every section in text (unavailable sections say why, unknown values read "unknown"), `-o json` writes the Gateway's document byte for byte, and `-o csv` matches the UI's metricsToCsv test expectations line for line; `csv` is refused by other commands. Live run pending (M19 verification debt). Auto-approval, 2026-11-13
- **Tests:** `go test -race ./...` passed
- **Conventions:** `ReadMetrics`, `MetricsToCSV`, `EscapeCSVField`, `WriteMetricsText`, `numberText`, `unknownIfEmpty` are single actions; `OutputFormat` takes extra formats per command
- **Vulnerability scan:** not needed

