# P60 · F30-B1 — Registered clusters and Production classification
- **Milestone:** M10
- **Covers:** F30-AC1
- **Discovery:** —
- **Status:** Building

## Existing baseline and boundaries
P49's policy denies Kafka mutations for an unclassified environment and P54
added audited, revisioned access administration for local global ADMINs.
Cluster IDs exist today only in the UI's runtime `config.json`, which must
never be a policy source. This phase adds a server-owned registry, loaded at
Console startup from an operator-controlled file, and audited classification.

Registration records a stable cluster ID, display name and HTTPS Gateway URL.
Binding the Gateway's verified service identity and Kafka cluster identity is
P55; retargeting an existing ID to another Gateway is refused rather than
silently inheriting its classification. The authorized cluster list for
ordinary users and environment badges are P55/P61.

## Demo
1. Start the Console with a cluster file listing `dev` and `prod`: both are
   registered unclassified, the environment lookup reports unclassified for
   them and for unknown IDs, and P49 policy denies Kafka writes for all three.
2. A global ADMIN classifies `prod` as Production with a reason; the audit
   records before/after environment, the reason and the policy revision. A
   missing reason (400), stale expected environment (409), cluster-only ADMIN
   (403) and query/header/display-name spoofing cannot change it.
3. Restarting with `prod` pointed at a different Gateway URL refuses to start;
   removing `dev` deactivates it, and new cluster-scoped grants for `dev`
   are rejected.

## Tasks
- [x] **T60.1 Registered-cluster schema and startup sync** — Covers: F30-AC1
  - Files: Gateway `internal/console/storage/migrate_database.go` (schema v12),
    `sync_registered_clusters.go` (new), `internal/console/identity/account.go`
    (types/errors), `identity/validate_cluster_id.go` (new),
    `cmd/console/load_cluster_registry.go` (new), `cmd/console/run_serve.go`,
    tests and the migration-downgrade test helper.
  - Do: Schema v12 adds `registered_clusters` (ID, display name, Gateway URL,
    environment `''`/`NON_PRODUCTION`/`PRODUCTION`, active). An optional
    absolute `KAFKA3O_CONSOLE_CLUSTERS_FILE` holds strict JSON
    `{"clusters":[{"id","name","gatewayUrl"}]}` with unique valid IDs and
    exact HTTPS URLs. Sync in one transaction: register new IDs unclassified,
    update display names, deactivate absent IDs, audit each change as the
    Console service, and refuse a changed Gateway URL.
  - Done when: `go test ./internal/console/storage ./internal/console/identity ./cmd/console -run 'RegisteredCluster|ClusterRegistry|ValidateClusterID|Migrat'`
    passes, including restart idempotence, deactivation and retarget refusal.
- [x] **T60.2 Audited Production classification** — Covers: F30-AC1
  - Files: Gateway `internal/console/storage/change_cluster_environment.go`
    (new), `internal/console/identity/change_cluster_environment.go` (new),
    `identity/valid_change_reason.go` (new), `identity/account.go` and tests.
  - Do: For a current local global ADMIN, require an active registered
    cluster, compare the expected environment (conflict on mismatch), accept
    only Production or non-Production plus a trimmed printable 1–512 byte
    reason, update the environment, bump the policy revision and audit
    before/after, reason and revision atomically.
  - Done when: `go test ./internal/console/... -run 'ClusterEnvironment|ChangeReason'`
    passes, covering cluster-ADMIN denial, conflict, missing reason, unknown
    or inactive cluster and audit failure.
- [ ] **T60.3 Registry-aware environment lookup and grant scope** — Covers: F30-AC1
  - Files: Gateway `internal/console/storage/cluster_environment.go` (new),
    `storage/change_role_grant.go`, `storage/change_group_mapping.go` and tests.
  - Do: `ClusterEnvironment` returns the stored environment only for an
    active registered cluster and unclassified otherwise; storage failures
    are errors, never non-Production. Cluster-scoped grant and mapping
    changes require an active registered cluster (`ErrUnknownCluster`).
  - Done when: `go test ./internal/console/storage -run 'ClusterEnvironment|RoleGrant|GroupMapping'`
    passes, including P49 policy denying writes for unknown, inactive and
    unclassified clusters.
- [ ] **T60.4 Cluster administration HTTP routes** — Covers: F30-AC1
  - Files: Gateway `internal/console/httpapi/list_registered_clusters.go`,
    `change_cluster_environment.go` (new), `enable_cluster_administration.go`
    (new), `write_access_change_error.go`, `session_api.go`,
    `internal/console/storage/list_registered_clusters.go`,
    `internal/console/identity/list_registered_clusters.go` (new),
    `cmd/console/new_session_handler.go`, `internal/console/README.md` and tests.
  - Do: Mount audited `GET /api/admin/clusters` and
    `PUT /api/admin/clusters/{clusterID}/environment` (`expectedEnvironment`,
    `environment`, `reason`, all required) with exact Origin, CSRF and strict
    JSON. Map 400 `change_reason_required`, 404 `cluster_not_found`, 409
    `policy_conflict`, 403 and 503 like access changes. The environment comes
    only from storage; headers, query parameters and display names are ignored.
  - Done when: `go test ./internal/console/httpapi ./cmd/console -run 'Cluster'`,
    `go test ./...` and `npm test` pass.

## Review
