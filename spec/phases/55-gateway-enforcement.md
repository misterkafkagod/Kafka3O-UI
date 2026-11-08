# P55 · F29-B1 + F29-B2 + F30-B2 — Console policy API and Gateway secured-mode enforcement
- **Milestone:** M10
- **Covers:** F29-AC1, F29-AC2, F30-AC2
- **Discovery:** [gateway-service-trust](../discovery/gateway-service-trust.md)
- **Status:** Review

## Existing baseline and boundaries
P49 evaluates roles and Production policy, P54/P60 own grants and
classification, and the discovery fixes the mTLS identities, delegation
header, binding v1 and timeout budget. Gateways today accept a shared bearer
token. This phase adds an explicit Gateway **secured mode** that accepts only
Console mTLS plus a current single-use delegation, and the Console policy API
that consumes delegations. Legacy token mode stays the default until the P59
cutover. Minting delegations from browser requests and the secured UI path
are P62; Production change reasons are P56 (Production mutations stay denied
until then); outcome audit is P57.

## Demo
1. A Console policy listener and a secured-mode Gateway with counting fake
   Kafka actions run with a throwaway service CA. A request without a client
   certificate, with a non-Console certificate, without a delegation, with a
   forged, expired, replayed or wrong-cluster delegation, or with a changed
   body, path or query is rejected (401/403) with zero Kafka calls.
2. With delegations minted for real Console sessions: VIEWER reads succeed
   and writes get 403; OPERATOR writes succeed on a non-Production cluster
   and get 403 on Production and unclassified clusters; every denial is
   audited.
3. Unknown Gateway routes are denied; `GET /api/v1/health/live` stays
   anonymous; a stopped policy listener yields 503 with no Kafka call.

## Tasks
- [x] **T55.1 Delegation storage and policy decision** — Covers: F29-AC2, F30-AC2
  - Files: Gateway `internal/console/storage/migrate_database.go` (v13),
    `storage/create_gateway_delegation.go`, `storage/consume_gateway_delegation.go`,
    `internal/console/delegation/` (new: types, `consume_delegation.go`,
    `mint_delegation.go`, `request_binding.go`) and tests; migration test helper.
  - Do: Store only the handle digest with session ID, cluster, action,
    binding, optional reason and ≤30 s expiry. Consume deletes the row in one
    transaction and returns the session's token digest and browser binding;
    the service then checks caller cluster, expiry, binding and action,
    re-resolves current grants and classification, evaluates P49 policy and
    audits the decision. Missing/expired/mismatched → invalid (401); denied
    → 403 with the P49 denial; storage failure → unavailable.
  - Done when: `go test ./internal/console/delegation ./internal/console/storage -run 'Delegation|Migrat'`
    passes, covering replay, expiry, binding/cluster/action mismatch,
    VIEWER/OPERATOR/ADMIN across Production, non-Production and unclassified,
    and a revoked session.
- [x] **T55.2 Console mTLS policy listener** — Covers: F29-AC2
  - Files: Gateway `internal/console/policyapi/` (new handler package and
    tests), `cmd/console/load_policy_config.go` (new), `cmd/console/run_serve.go`,
    `internal/console/README.md` and tests.
  - Do: Optional listener from `KAFKA3O_CONSOLE_POLICY_LISTEN`,
    `KAFKA3O_CONSOLE_POLICY_TLS_CERT_FILE`/`_KEY_FILE` and
    `KAFKA3O_CONSOLE_SERVICE_CA_FILE`: TLS 1.3, required client certificate
    from the service CA, caller cluster from the exact URI SAN
    `spiffe://kafka3o/gateway/<clusterID>`; strict JSON
    `POST /internal/v1/delegations/consume` returning `{allowed, actorId, source, denial}`.
  - Done when: `go test ./internal/console/policyapi ./cmd/console -run 'Policy'`
    passes, including wrong identity, unregistered cluster and malformed body.
- [x] **T55.3 Gateway route action catalog** — Covers: F29-AC1
  - Files: Gateway `internal/gatewayauth/` (new: `classify_route.go` and
    tests), `cmd/gateway` route-coverage test.
  - Do: Map every registered method and path template to its P49 action;
    unknown routes and methods map to deny; liveness is the only anonymous
    route. A test walks the Gateway's registered OpenAPI operations and fails
    if any lacks a mapping.
  - Done when: `go test ./internal/gatewayauth ./cmd/gateway -run 'Route|Catalog'` passes.
- [x] **T55.4 Gateway secured mode** — Covers: F29-AC1, F29-AC2, F30-AC2
  - Files: Gateway `internal/gatewayauth/with_delegated_authorization.go`,
    `console_policy_client.go`, `request_binding.go` (new), `internal/config/`
    (secured-mode settings), `cmd/gateway/main.go`,
    `cmd/gateway/new_gateway_http_server.go` and tests, `deploy/README.md`.
  - Do: `security.mode: secured` requires the service CA, Gateway
    cluster ID, client certificate/key and HTTPS Console policy URL; the
    listener requires verified client certificates and accepts only
    `spiffe://kafka3o/console` (bearer token and CORS disabled). Middleware
    classifies the route, reads the body (bounded) and restores it, computes
    binding v1, consumes within 1 s and maps invalid → 401, denied → 403,
    unavailable → 503 problem JSON before any handler runs.
  - Done when: `go test ./internal/gatewayauth ./internal/config ./cmd/gateway -run 'Secured|Delegat|Policy'`
    passes with fake policy clients and counting handlers.
- [x] **T55.5 End-to-end enforcement verification** — Covers: F29-AC1, F29-AC2, F30-AC2
  - Files: Gateway `cmd/gateway/secured_mode_integration_test.go` (new),
    `internal/console/README.md`, `deploy/README.md`.
  - Do: Wire a real Console store and policy listener with a secured
    Gateway handler over generated mTLS certificates and counting fake Kafka
    actions to exercise the demo matrix, including policy outage.
  - Done when: `go test ./cmd/gateway -run 'SecuredModeEndToEnd'`,
    `go test ./...` and `npm test` pass.

## Review
