# P62 · F29-B1 + F29-B3 — Console request forwarding and secured UI path
- **Milestone:** M10
- **Covers:** F29-AC3, F29-AC4
- **Discovery:** [gateway-service-trust](../discovery/gateway-service-trust.md)
- **Status:** Building

## Existing baseline and boundaries
P55 added the Console policy listener, delegation storage and Gateway secured
mode, but nothing mints delegations from browser requests and the UI still
calls Gateways directly with shared tokens. This phase adds the Console's
same-origin forwarding API, the authorized cluster list and an explicit
secured UI build mode, and makes Cognito sessions decide exactly like local
ones. Production change reasons remain P56 (Production ADMIN writes stay
denied); outcome audit is P57; deployment and cutover are P59.

## Demo
1. In the secured-mode fixture, a local VIEWER and a Cognito VIEWER see only
   their readable clusters with authoritative environments and read topics
   through the Console; both are denied writes identically.
2. An OPERATOR produces on a non-Production cluster through the Console; the
   Gateway receives the exact bytes with a single-use delegation; a lost
   response reports an unknown outcome and is never retried.
3. Revoking the session makes the next request 401 and the UI return to
   sign-in; a stopped policy listener shows "authorization unavailable", not
   "Gateway unreachable"; a 403 explains the restriction.

## Tasks
- [x] **T62.1 Authorized cluster list** — Covers: F29-AC3
  - Files: Gateway `internal/console/storage/list_active_clusters.go`,
    `internal/console/httpapi/list_authorized_clusters.go`,
    `enable_gateway_forwarding.go` (new), `session_api.go` and tests.
  - Do: `GET /api/clusters` for any current session (local or Cognito, bound
    or not) returns active registered clusters where the session's current
    effective role is at least VIEWER, with name, environment and effective
    role, never Gateway URLs; no-store; 401 clears cookies; resolution
    failures are 503.
  - Done when: `go test ./internal/console/httpapi ./internal/console/storage -run 'AuthorizedClusters|ActiveClusters'` passes.
- [ ] **T62.2 Console Gateway forwarder** — Covers: F29-AC3, F29-AC4
  - Files: Gateway `internal/console/gatewayproxy/` (new: forwarder,
    mTLS client, response mapping, tests), `internal/console/httpapi/forward_gateway_request.go`
    (new), `cmd/console/load_forwarding_config.go` (new),
    `cmd/console/run_serve.go`, `cmd/console/new_session_handler.go`.
  - Do: `/api/clusters/{clusterID}/gateway/api/v1/...` checks session (CSRF
    on non-GET), active registration and the route catalog, rejects duplicate
    query keys and bodies over 1 MiB, mints a delegation bound to the exact
    bytes, strips client `X-Kafka3O-*`, `Authorization`, cookie and forwarding
    headers and forwards once over mTLS (6 s) to the registered Gateway URL.
    Gateway 401/403/503 map to 401 (cookies cleared), 403 with denial and
    `503 authorization_unavailable`; transport failure is
    `503 gateway_unavailable` for reads and `503 gateway_outcome_unknown` for
    writes.
  - Done when: `go test ./internal/console/gatewayproxy ./internal/console/httpapi ./cmd/console -run 'Forward|Gateway'` passes.
- [ ] **T62.3 Identical Cognito decisions** — Covers: F29-AC3
  - Files: Gateway `internal/console/delegation/consume_delegation.go`,
    `internal/console/httpapi/cognito_services.go`, `cmd/console/new_cognito_services.go`,
    `cmd/console/new_policy_handler.go`, `cmd/console/run_serve.go` and tests.
  - Do: The decision reads the refresh-token protector through a provider
    published with the Cognito services, so Cognito sessions are decided like
    local ones once discovery succeeds and fail closed before it.
  - Done when: `go test ./internal/console/storage ./cmd/console -run 'Delegation|Cognito'` passes with a Cognito VIEWER/OPERATOR matrix.
- [ ] **T62.4 Secured UI mode** — Covers: F29-AC3, F29-AC4
  - Files: UI `src/console/fetchConsoleGatewayJson.ts`,
    `src/console/loadAuthorizedClusters.ts`, `src/console/ConsoleGatewayError.ts`
    (new), `src/components/ConsoleSessionGate.tsx`, `src/main.tsx`,
    `src/components/GatewayErrorRecovery.tsx` and tests.
  - Do: `VITE_KAFKA3O_CONSOLE_SECURED=true` renders the existing App inside
    the signed-in gate with clusters from `GET /api/clusters` and every
    Gateway call sent same-origin through the Console with the session cookie
    and CSRF on writes, no tokens or credentials panel. 401 returns to
    sign-in and clears caches; 403 explains the denial; authorization and
    Gateway unavailability and unknown write outcomes are distinct.
  - Done when: focused tests, `npm test` and `npm run build` (default,
    preview and secured) pass.
- [ ] **T62.5 Secured path end to end** — Covers: F29-AC3, F29-AC4
  - Files: Gateway `cmd/console/secured_forwarding_integration_test.go` (new),
    Gateway `internal/console/README.md`.
  - Do: Real Console session API, forwarder and policy listener with a
    secured Gateway handler and counting fake Kafka actions over generated
    mTLS: local and Cognito VIEWER/OPERATOR matrix, exact bytes, replay
    impossible, revocation, policy outage, unknown write outcome.
  - Done when: `go test ./cmd/console -run 'SecuredForwarding'` and `go test ./...` pass.

## Review
