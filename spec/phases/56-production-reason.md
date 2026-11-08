# P56 · F30-B3 — Production-aware confirmation and reason
- **Milestone:** M10
- **Covers:** F30-AC4
- **Discovery:** —
- **Status:** Review

## Existing baseline and boundaries
P49 denies Production mutations without a change reason and P55/P62 deliver
the reason field of a delegation, but nothing supplies one, so Production
ADMIN writes are always denied. This phase lets the secured UI collect a
reason for every Production mutation and the Console bind it into the
delegation. Existing validation, read-only/sensitive settings and
irreversible-operation confirmations are unchanged; ADMIN never bypasses them.

## Demo
1. In the secured path an ADMIN produces to a Production cluster: the UI asks
   for a reason naming the cluster; the write succeeds and the decision audit
   records the reason.
2. Canceling the prompt or entering an empty reason sends no request; an
   OPERATOR with a reason is still denied on Production.
3. Cluster cards show the authoritative Production badge; non-Production and
   read requests never ask for a reason; a reason on a read is rejected.

## Tasks
- [x] **T56.1 Bind change reasons into Production delegations** — Covers: F30-AC4
  - Files: Gateway `internal/console/identity/validate_change_reason.go` (new),
    `internal/console/httpapi/forward_gateway_request.go` and tests,
    `cmd/console/secured_forwarding_integration_test.go`, `internal/console/README.md`.
  - Do: Mutations may carry `X-Kafka3O-Change-Reason` (trimmed, printable,
    1–512 bytes, one value); it is stored in the delegation and so decides
    P49's reason check and is audited. A reason on GET, duplicates or an
    invalid value return 400 before minting; the header is never forwarded.
  - Done when: `go test ./internal/console/httpapi ./cmd/console -run 'Forward|SecuredForwarding'`
    passes with ADMIN-with-reason allowed, ADMIN-without-reason and
    OPERATOR-with-reason denied on Production, and the reason audited.
- [x] **T56.2 Production reason prompt in the secured UI** — Covers: F30-AC4
  - Files: UI `src/console/loadAuthorizedClusters.ts`, `src/gateway/types.ts`,
    `src/console/fetchConsoleGatewayJson.ts`, `src/console/ProductionChangeCanceled.ts`
    (new), `src/gateway/classifyGatewayError.ts`, `src/gateway/describeGatewayError.ts`,
    `src/main.tsx` and tests.
  - Do: Keep each authorized cluster's environment; before any non-GET to a
    Production cluster ask an injected `requestReason(clusterName)`; a cancel
    or blank answer throws a "canceled, nothing sent" error without calling
    fetch; otherwise send the trimmed reason header.
  - Done when: `npm test -- src/console/fetchConsoleGatewayJson.test.ts src/console/loadAuthorizedClusters.test.ts src/gateway`
    passes.
- [x] **T56.3 Authoritative Production badge** — Covers: F30-AC4 (display of F30-B1)
  - Files: UI `src/components/ClusterCard.tsx`, its CSS and tests.
  - Do: Cluster cards show "Production" or "Unclassified — writes blocked"
    when the entry carries a Console environment; legacy config entries show
    nothing.
  - Done when: `npm test -- src/components/ClusterCard.test.tsx`, `npm test` and
    `npm run build` (default, preview, secured) pass.

## Review
