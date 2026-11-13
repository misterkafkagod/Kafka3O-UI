# P121 · F68-B1 — Audit query
- **Milestone:** M22
- **Covers:** F68-AC1
- **Discovery:** —
- **Status:** Building

## Demo
1. `kafka3o audit --cluster kafka-a --from <today> --limit 5` lists the first five events of today's demos in order (time, operation, actor, source, cluster, action, resource, decision, outcome, reason) and prints the `--after` value for the next page; the next page continues from there.
2. `--outcome maybe`, `--from` after `--until` and `--limit 501` are refused before sending; `-o json` prints the Console's page.

## Tasks
- [x] **T121.1 Audit filters and listing** — Covers: F68-AC1
  - Files: Kafka3O-cli internal/audit/audit_event.go (new), internal/audit/build_audit_query.go (new), internal/audit/build_audit_query_test.go (new), internal/audit/list_audit_events.go (new), internal/audit/list_audit_events_test.go (new), internal/console/problem.go, internal/console/problem_test.go
  - Do: `BuildAuditQuery` checks and encodes the filters like the Console's `readAuditQuery` (cluster id, actor, action, outcome among the Console's nine, from/until as RFC 3339 or Unix milliseconds sent as UTC RFC 3339 with from before until, limit 1–500, after a non-negative sequence; empty filters left out); `ListAuditEvents` reads `/api/audit?…` into a page (events, nextCursor, operationId). `Problem` gains the Console's `operationId`, shown in its text when present.
  - Done when: `go test ./internal/audit/ ./internal/console/ -run 'BuildAuditQuery|ListAuditEvents|Problem'` passes covering every filter, each refusal, both time forms and the operation id.
- [ ] **T121.2 `kafka3o audit`** — Covers: F68-AC1
  - Files: internal/cli/admin_error.go (new), internal/cli/admin_error_test.go (new), internal/cli/new_audit_command.go (new), internal/cli/new_audit_command_test.go (new), internal/cli/exit_code.go, cmd/kafka3o/main.go
  - Do: `audit [filters]` prints `TIME OPERATION ACTOR SOURCE CLUSTER ACTION RESOURCE DECISION OUTCOME REASON` (local time, every text terminal-escaped), "No audit events." when empty, and "More events: --after <cursor>" when the page is full; `-o json` prints the page. `adminError` is a port of the UI's describeAdminError for the Console's codes (audit_access_denied, global_admin_required, password_change_required, self_access_change, policy_conflict, last global admin, not found, change_reason_required, `*_audit_unavailable` = nothing changed, other refusals with the Console's title); an unavailable Console is the new `ErrServiceUnavailable` (exit 2).
  - Done when: `go test ./internal/cli/ -run 'AuditCommand|AdminError'` passes covering the table, paging hint, JSON, escaping, a denied scope and an unavailable Console.

## Review
