# P74 · F35-B3 — Pause, resume and restart connectors and tasks
- **Milestone:** M12
- **Covers:** F35-AC3, F35-AC4
- **Discovery:** [kafka-connect-api](../discovery/kafka-connect-api.md)
- **Status:** Done

## Demo
1. In the Gateway repository, run `go test ./internal/connect`, `go test ./internal/httpapi -run Connect` and `go test ./cmd/gateway`.
2. In the UI's Connect tab, pause a running connector, resume it, restart it and restart one task, each after confirmation; the list refreshes to the new state; canceling sends nothing; a denial, a rejected action and an unknown outcome each have their own message.
3. On EKS-D after the user's `deploy.sh`: pause, resume and restart `kafka3o-verify-paused` and restart task 0 of `kafka3o-verify-failing` on Kafka A; an OPERATOR on a Production cluster would be denied before Connect; the audit lists each action with its outcome.

## Tasks
- [x] **T74.1 Connector actions in the Gateway** — Covers: F35-AC3
  - Files: Gateway internal/connect/connector.go, internal/connect/validate_connector_name.go (new, with test), internal/connect/send_connect_action.go (new), internal/connect/send_connect_action_test.go (new), internal/connect/manage_connector.go (new, interface and timeout wrapper, with test)
  - Do: Implement discovery recipe steps 3–6 for actions: pause (`PUT .../pause`), resume (`PUT .../resume`), restart (`POST .../restart?includeTasks=true&onlyFailed=false`) and task restart (`POST .../tasks/{id}/restart`), with the name validated (1–249 characters, no `/`, no control characters, no surrounding spaces) and path-escaped. 2xx is accepted; Connect 404 → `ErrConnectorNotFound`; other 4xx → `ErrConnectRejected`; 5xx → `ErrConnectUnreachable`; no response (connection reset, timeout after sending) → `ErrConnectActionUnknown`; not configured → `ErrConnectNotConfigured`.
  - Done when: `go test ./internal/connect` passes with an `httptest` Connect, covering each action's method and path, name validation and escaping, and every error mapping.
- [x] **T74.2 Action routes and authorization** — Covers: F35-AC3, F35-AC4
  - Files: Gateway internal/httpapi/register_connector_actions.go (new), internal/httpapi/register_connector_actions_test.go (new), internal/httpapi/new_connect_problem.go, internal/authorization/policy.go, internal/authorization/classify_action.go, internal/authorization/evaluate_policy_test.go, internal/gatewayauth/route_actions.go, internal/gatewayauth/classify_route_test.go, cmd/gateway/gateway_routes.go, cmd/gateway/main.go, cmd/gateway/route_catalog_test.go
  - Do: `POST /api/v1/connect/connectors/{connector}/pause|resume|restart` and `POST /api/v1/connect/connectors/{connector}/tasks/{task}/restart` return 202 `{connector, action, task?}`; 400 `invalid_connector`, 404 `not_found` or `connect_not_configured`, 409 `connect_rejected`, 503 `connect_unreachable` or `connect_action_unknown`. The four actions (`connect.connectors.pause`, `.resume`, `.restart`, `connect.tasks.restart`) are writes: secured Gateways require OPERATOR, or ADMIN plus a reason on Production, before Connect is called, and record intent and outcome (`connect_action_unknown` as unknown).
  - Done when: `go test ./internal/httpapi -run Connect`, `go test ./internal/gatewayauth`, `go test ./internal/authorization` and `go test ./cmd/gateway` pass; then `go test ./...` passes.
- [x] **T74.3 Actions in the Connect tab** — Covers: F35-AC3, F35-AC4
  - Files: UI src/gateway/runConnectorAction.ts (new, with test), src/gateway/describeConnectorActionError.ts (new, with test), src/components/ConnectConnectors.tsx, src/components/ConnectConnectors.test.tsx, src/components/ConnectConnectors.module.css, src/pages/ClusterPage.tsx, src/App.tsx, src/main.tsx
  - Do: Each connector row gets Pause (or Resume when paused) and Restart; each task gets "Restart task N". Every action asks for confirmation naming the connector (and task), then sends the request, shows "Pause requested for <name>" (or the matching message) and refreshes the list immediately and again after 3 seconds, because Connect applies actions asynchronously. Canceling sends nothing; denials, Production cancellation, rejections, not found, unreachable and unknown outcomes each have their own message.
  - Done when: `npx vitest run src/gateway/runConnectorAction.test.ts src/gateway/describeConnectorActionError.test.ts src/components/ConnectConnectors.test.tsx` passes, covering each action's request, confirm and cancel, the refresh and each message; then `npm test` and `npm run build` pass.

## Review
- **Demo:** steps 1–2 passed (auto-approved under the user's standing M12 instruction, 2026-11-10; run by Claude). Gateway: each action uses the request recorded in the kafka-connect-api discovery (`PUT` pause/resume, `POST` restart with `includeTasks=true&onlyFailed=false`, `POST` task restart), names are validated and escaped, Connect 404/4xx/5xx and dropped connections map to not found, rejected, unreachable and unknown; the four routes answer 202, are writes in the policy (OPERATOR, Production ADMIN plus reason, intent and outcome audit with `connect_action_unknown` as unknown) and a negative task never reaches Connect. UI in Chromium 1194 with a synthesized Gateway that applies actions asynchronously like Connect, 7/7: canceling sends nothing; Pause then Resume show the requested message and the refreshed list follows; connector and task restarts reach their routes; a Production denial and an unknown outcome are explained; no overflow at 320 px. Step 3 (EKS-D) waits for the user's `deploy.sh`.
- **Vulnerability scan (milestone close):** `npm audit`: 0 findings; `govulncheck@v1.9.0 -test -tags integration ./...` (Gateway): 0 called, 1 uncalled module advisory (GO-2026-5932, unchanged since M10), within policy; the Connect client adds no dependency.
- **Regression:** Gateway `go test ./...` passed (24 operations in the route catalog); UI `npm test` 520 passed (5 opt-in skipped); default build.
- **Convention check:** one action per file in `internal/connect` and `src/gateway`; the Connect tab keeps its handlers inside the component like the other pages.
- **Note:** a refused connection before Connect answered is reported as an unknown outcome, the cautious choice for a write; the Console audit records it as unknown.

