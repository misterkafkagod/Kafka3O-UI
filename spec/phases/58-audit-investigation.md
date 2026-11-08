# P58 · F31-B2 — Permission-scoped audit investigation
- **Milestone:** M10
- **Covers:** F31-AC3
- **Discovery:** —
- **Status:** Done

## Existing baseline and boundaries
P50–P57 write append-only, sanitized audit events with server time,
operation IDs and before/after values; storage can list them by global or
cluster scope. No API or page exposes them. P49 defines
`console.audit.global.read` (global ADMIN) and `console.audit.cluster.read`
(ADMIN for that cluster). The application offers no way to change or delete
audit records. Retention and backup are P59.

## Demo
1. A global ADMIN filters global audit by time, actor, action and outcome,
   sees intent and outcome grouped by operation ID, and exports CSV.
2. A `prod` cluster ADMIN sees and exports only `prod` events; requesting
   global scope or another cluster is denied (403) and audited; VIEWERs and
   OPERATORs cannot read audit.
3. Every read and export is itself audited; exported cells cannot start a
   spreadsheet formula.

## Tasks
- [x] **T58.1 Permission-scoped audit search API** — Covers: F31-AC3
  - Files: Gateway `internal/console/httpapi/list_audit_events.go`,
    `authorize_audit_query.go`, `read_audit_query.go`, `enable_audit_investigation.go`
    (new), `session_api.go`, `cmd/console/new_session_handler.go` and tests.
  - Do: `GET /api/audit` for any session: no `cluster` means global scope
    (global ADMIN), `cluster=<id>` means that cluster (ADMIN there or global
    ADMIN). Filters `actor`, `action`, `outcome`, `from`, `until` (RFC 3339),
    `after` (sequence) and `limit` (1–500, default 100) are strictly parsed.
    The read is audited (`console.audit.read`) before data is returned; audit
    failure returns 503 and no data; denials are audited and 403.
  - Done when: `go test ./internal/console/httpapi -run 'Audit'` passes.
- [x] **T58.2 Audited CSV export** — Covers: F31-AC3
  - Files: Gateway `internal/console/httpapi/export_audit_events.go`,
    `write_audit_csv.go`, `neutralize_csv_cell.go` (new) and tests.
  - Do: `GET /api/audit/export` with the same scope and filters returns at
    most 10 000 events as `text/csv` attachment, audited as
    `console.audit.export`; cells beginning with `=`, `+`, `-`, `@`, tab or CR
    are prefixed with `'`.
  - Done when: `go test ./internal/console/httpapi -run 'AuditExport|CSV'` passes.
- [x] **T58.3 Audit investigation view** — Covers: F31-AC3
  - Files: UI `src/console/ConsoleAudit.ts`, `requestConsoleAudit.ts`,
    `parseAuditPage.ts`, `groupAuditTimeline.ts`, `src/components/AuditInvestigation.tsx`
    and CSS (new), `src/components/ConsoleSessionGate.tsx`, `src/main.tsx` and tests.
  - Do: Scope selector (global or a cluster), filters, a table with intent
    and outcome grouped by operation ID, "Load more", and an export link to the
    same-origin export URL; 403 explains the scope, 401 returns to sign-in.
  - Done when: focused tests, `npm test` and all three builds pass.

## Review
- **Demo:** passed (auto-approved under the user's standing M10 instruction,
  2026-11-08; run by Claude, not observed live). Over verified HTTPS with a
  real Console store: the global ADMIN's search included global security
  events (account changes); a `prod` cluster ADMIN saw and exported only
  `prod` events and was denied (403, audited) for global scope and `dev`; an
  OPERATOR was denied all audit; anonymous requests got 401; malformed
  filters 400. Each read and export was audited (`console.audit.read`,
  `console.audit.export`) and a read that could not be audited returned 503
  without data. CSV export used formula-neutralized cells. UI tests covered
  scope selection, operation-grouped intent/outcome rows with reasons,
  "Load more", the scoped export link, the scope-denial message and 401
  returning to sign-in; all four opt-in preview integrations still passed.
- **Plan deviations:** `httpapi` defines its own audit record/filter types and
  `cmd/console` adapts the store, avoiding an import cycle with storage tests;
  the UI reuses the admin transport (`listAudit`) and loads scope choices from
  the user's authorized cluster list.
- **Regression:** full Gateway suite; UI suite 435 passed, 5 opt-in skipped;
  default, preview and secured builds passed.
- **Convention check:** passed (the composition-root store adapter has the two
  methods its interface requires).
- **Vulnerability scan:** not required; no dependency manifests changed.
- **Not run:** retention, SQLite-consistent backup/restore and file-permission
  verification on the deployed volume (P59); native-browser checks.

