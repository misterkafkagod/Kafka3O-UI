# P54 · F28-B1 + F28-B3 — Audited access-administration API
- **Milestone:** M10
- **Covers:** F28-AC1, F28-AC3, server portion of F28-AC4
- **Discovery:** —
- **Status:** Building

## Existing baseline and boundaries
P49 resolves additive global/cluster roles; P51–P53 provide local and
Cognito sessions, audited local-account administration and an initially
empty `cognito_group_bindings` table. Grants are already resolved from the
database on every authorization decision, so a committed change affects the
target's next request without a new login or browser-held permissions.

Management routes require a current **local** global ADMIN, as existing
account administration does; Cognito-sourced global ADMIN administration and
the access-management UI are out of scope (UI is P61). Cluster registration
and Production classification are P60. Grants may name any syntactically
valid cluster ID; P60 adds registry validation.

## Demo
1. In the verified-HTTPS Console fixture the bootstrapped administrator grants
   alice global VIEWER and ADMIN on `cluster-a`; the access listing shows each
   grant with source (direct or Cognito group) and scope, and the audit trail
   records redacted before/after roles.
2. alice (cluster-only ADMIN) changing grants or group mappings, and any
   administrator changing their own grants, receive 403 and are audited.
3. A change with a stale expected role receives 409 and writes nothing;
   demoting the last enabled local global ADMIN receives 409
   `last_global_admin`.
4. Removing alice's `cluster-a` grant changes her next grant resolution
   without re-login; removing a group mapping changes the Cognito session's
   next resolution.

## Tasks
- [x] **T54.1 Policy revision and before/after audit values** — Covers: foundation of F28-AC4
  - Files: Gateway `internal/console/storage/migrate_database.go`,
    `database.go`, `insert_audit_event.go`, `validate_audit_event.go`,
    `list_audit_events.go`, `next_policy_revision.go` (new) and tests.
  - Do: Schema v11 adds a single-row policy revision counter and
    `before_state`/`after_state` audit columns that accept only an empty
    value, a role token or an environment token (redacted by construction).
    `nextPolicyRevision` increments the counter inside a caller's transaction.
  - Done when: `go test ./internal/console/storage -run 'Migrat|Audit|PolicyRevision'`
    passes, including v10→v11 migration and rejection of non-token values.
- [x] **T54.2 Audited direct role-grant changes** — Covers: F28-AC1, F28-AC3, F28-AC4
  - Files: Gateway `internal/console/storage/change_role_grant.go` (new),
    `internal/console/identity/change_role_grant.go` (new),
    `internal/console/identity/account.go` (types/errors) and tests.
  - Do: In one transaction recheck the local global ADMIN actor, require an
    existing local or Cognito target identity, reject changes to the actor's
    own grants, compare the expected current role (conflict on mismatch),
    protect the last enabled local global ADMIN, set or remove the grant,
    bump the policy revision and write an allowed/denied audit event with
    before/after roles. Audit failure blocks the change; commit uncertainty is
    reported as unknown.
  - Done when: `go test ./internal/console/... -run 'RoleGrant'` passes,
    covering cluster-ADMIN denial, self-change, conflict, last admin, audit
    failure and the next grant resolution observing the change.
- [x] **T54.3 Audited Cognito group-mapping changes** — Covers: F28-AC1, F28-AC3, F28-AC4
  - Files: Gateway `internal/console/storage/change_group_mapping.go` (new),
    `internal/console/identity/change_group_mapping.go` (new) and tests.
  - Do: The same transaction pattern for exact issuer + case-sensitive group +
    scope → role, with strict HTTPS-issuer and printable group validation.
  - Done when: `go test ./internal/console/... -run 'GroupMapping'` passes,
    including a Cognito session losing a mapped grant on its next resolution.
- [x] **T54.4 Bounded, audited access listing** — Covers: F28-AC4
  - Files: Gateway `internal/console/storage/list_access_bindings.go` (new),
    `internal/console/identity/list_access_bindings.go` (new) and tests.
  - Do: Return a bounded, cursor-paged list of identities (local username or
    Cognito subject, never email), their direct grants, all group mappings
    and the current policy revision, audited like the account listing; never
    return credentials.
  - Done when: `go test ./internal/console/... -run 'AccessBindings'` passes.
- [ ] **T54.5 Access-administration HTTP routes** — Covers: F28-AC1, F28-AC3, F28-AC4
  - Files: Gateway `internal/console/httpapi/list_access_bindings.go`,
    `change_role_grant.go`, `change_group_mapping.go` (new),
    `session_api.go`, `new_session_api.go`, `cmd/console/new_session_handler.go`,
    `internal/console/README.md` and tests.
  - Do: Mount `GET /api/admin/access`, `PUT /api/admin/role-grants` and
    `PUT /api/admin/group-mappings` with exact Origin, session-bound CSRF and
    strict JSON. Distinguish 401, 403, 409 (`policy_conflict`,
    `last_global_admin`), 503 audit unavailability and an unknown outcome that
    is never automatically retried.
  - Done when: `go test ./internal/console/httpapi ./cmd/console -run 'Access|RoleGrant|GroupMapping'`,
    `go test ./...` and `npm test` pass.

## Review
