# P57 · F31-B1 + F31-B3 — Correlated security and mutation audit
- **Milestone:** M10
- **Covers:** F31-AC1, F31-AC2, F31-AC5
- **Discovery:** —
- **Status:** Review

## Existing baseline and boundaries
P51–P56 audit logins, logouts, revocations, account, grant, mapping and
classification changes, and every delegated decision; a mutation's allowed
decision is committed before the Gateway may call Kafka, and audit failure
already blocks dispatch. Missing: allowed read decisions are audited on
every poll, Kafka outcomes are never recorded, and an intent without an
outcome is not surfaced. Audit search/export is P58.

## Demo
1. Status polling through the secured path adds no audit events; read denials
   are still audited.
2. An allowed Production mutation records its intent (with reason) and then
   a correlated outcome (confirmed, validation-rejected, failed or unknown)
   under the same operation ID; a second outcome for it is rejected.
3. When the outcome cannot be recorded after Kafka was called, the client gets
   503 `outcome_unknown` with the operation ID instead of a success; intents
   without outcomes are listed as unresolved and logged at Console start,
   never replayed.

## Tasks
- [x] **T57.1 No audit noise for permitted reads** — Covers: F31-AC1
  - Files: Gateway `internal/authorization/is_kafka_mutation.go` (new),
    `internal/console/delegation/consume_delegation.go` and tests.
  - Do: Allowed read decisions are not audited; denials, invalid delegations
    and every mutation decision still are, and a mutation's allowed decision
    remains the durable intent written before dispatch.
  - Done when: `go test ./internal/authorization ./internal/console/storage -run 'Mutation|Delegation'` passes.
- [x] **T57.2 Correlated outcome recording** — Covers: F31-AC2
  - Files: Gateway `internal/console/storage/record_gateway_outcome.go` (new),
    `internal/console/delegation/` (outcome types, `record_outcome.go`),
    `internal/console/policyapi/` (outcome route) and tests.
  - Do: `POST /internal/v1/delegations/outcome` from the verified Gateway
    records one outcome (`confirmed`, `validation_rejected`, `failed`,
    `unknown`) for an allowed mutation intent of the caller's cluster, with
    the same operation ID and actor; unknown, foreign or duplicate outcomes are
    rejected.
  - Done when: `go test ./internal/console/storage ./internal/console/policyapi -run 'Outcome'` passes.
- [x] **T57.3 Gateway outcome reporting** — Covers: F31-AC2, F31-AC5
  - Files: Gateway `internal/gatewayauth/with_delegated_authorization.go`,
    `console_policy_client.go`, `classify_outcome.go`,
    `buffered_response.go` (new) and tests; UI `src/gateway/classifyGatewayError.ts` and test.
  - Do: For mutations the Gateway buffers the handler's response, classifies
    it (2xx confirmed, 4xx validation-rejected, write-unknown problems
    unknown, other 5xx failed) and reports it within 1 s. If reporting fails
    it returns `503 outcome_unknown` with the operation ID instead of the
    buffered result. Reads are unchanged.
  - Done when: `go test ./internal/gatewayauth -run 'Outcome|Delegat'` and the UI gateway tests pass.
- [x] **T57.4 Unresolved intents and end-to-end audit** — Covers: F31-AC2, F31-AC5
  - Files: Gateway `internal/console/storage/list_unresolved_gateway_intents.go`
    (new), `cmd/console/run_serve.go`, `cmd/console/secured_forwarding_integration_test.go`,
    `internal/console/README.md` and tests.
  - Do: List allowed mutation intents older than a bound without an outcome;
    the Console logs their count and operation IDs at startup. Extend the
    end-to-end test: no read noise, intent and outcome correlated, outcome
    store failure yields `outcome_unknown`, unresolved intents listed.
  - Done when: `go test ./cmd/console -run 'SecuredForwarding|Unresolved'`, `go test ./...` and `npm test` pass.

## Review
