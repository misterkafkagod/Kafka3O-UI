# P73 · F35-B1 + F35-B2 — Inspect Kafka Connect
- **Milestone:** M12
- **Covers:** F35-AC1, F35-AC2
- **Discovery:** [kafka-connect-api](../discovery/kafka-connect-api.md)
- **Status:** Building

## Demo
1. In the Gateway repository, run `go test ./internal/connect` and `go test ./internal/httpapi -run Connect`.
2. In the UI, open a cluster's Connect tab: connectors are listed with type, state, worker and task states, and a failed task shows its error summary; a cluster without Connect says "Kafka Connect is not configured for this cluster"; an unreachable Connect says so with Retry.
3. On EKS-D after the user's `deploy.sh`: Kafka A's Connect tab lists `kafka3o-verify-running`, `-paused` and `-failing` from the test worker with no configuration values; Kafka B says "not configured".

## Tasks
- [x] **T73.1 Connect client in the Gateway** — Covers: F35-AC1, F35-AC2
  - Files: Gateway internal/connect/connector.go (new, data types and errors), internal/connect/list_connectors.go (new, interface and timeout wrapper, with test), internal/connect/fetch_connect_connectors.go (new), internal/connect/fetch_connect_connectors_test.go (new), internal/connect/summarize_connect_trace.go (new, with test), internal/connect/testdata/connectors-expand-status.json (new, copied from the discovery fixture), internal/config/config.go, internal/config/load_config.go, internal/config/load_config_test.go, internal/config/validate_connect_url.go (new, with test), internal/connect/compare_connectors.go and compare_connect_tasks.go (new, with tests)
  - Do: Implement discovery recipe steps 1–2 and 6 for reads: an optional `connect.url` (`KAFKA3O_CONNECT__URL`, http or https only) selects the Connect REST API; without it the list returns `ErrConnectNotConfigured`. `GET /connectors?expand=status` is mapped to connectors (name, type, state, worker) and tasks (id, state, worker, first trace line cut to 500 characters), sorted by name; configuration is never requested. Non-2xx, malformed JSON, timeouts and connection failures return `ErrConnectUnreachable`.
  - Done when: `go test ./internal/connect ./internal/config` (per package) passes with an `httptest` Connect serving the discovery fixture, covering mapping, the trace summary, sorting, not configured, 5xx, malformed JSON and an unreachable address.
- [x] **T73.2 Connect list route and authorization** — Covers: F35-AC1, F35-AC2
  - Files: Gateway internal/httpapi/register_list_connectors.go (new), internal/httpapi/register_list_connectors_test.go (new), internal/httpapi/new_connect_problem.go (new), internal/authorization/policy.go, internal/authorization/classify_action.go, internal/authorization/evaluate_policy_test.go, internal/gatewayauth/classify_route.go, internal/gatewayauth/route_actions.go, internal/gatewayauth/classify_route_test.go, cmd/gateway/gateway_routes.go, cmd/gateway/main.go, cmd/gateway/route_catalog_test.go, deploy/kubernetes/secured-test/deployment.yaml, deploy/kubernetes/secured-test/README.md
  - Do: `GET /api/v1/connect/connectors` returns the list; 404 `connect_not_configured`, 503 `connect_unreachable`. The action `connect.connectors.list` is a cluster read (VIEWER) and the classifier recognizes `connect/...` routes. The EKS-D manifest gives `gateway-a` the test worker's Service URL; `gateway-b` stays without Connect.
  - Done when: `go test ./internal/httpapi -run Connect`, `go test ./internal/gatewayauth`, `go test ./internal/authorization` and `go test ./cmd/gateway` pass; then `go test ./...` passes.
- [x] **T73.3 Connect tab** — Covers: F35-AC1, F35-AC2
  - Files: UI src/gateway/listConnectors.ts (new, with test), src/hooks/useConnectors.ts (new), src/components/ConnectConnectors.tsx (new), src/components/ConnectConnectors.module.css (new), src/components/ConnectConnectors.test.tsx (new), src/components/ClusterTabs.tsx, src/components/ClusterTabs.test.tsx, src/components/AppShell.tsx, src/pages/ClusterPage.tsx, src/App.tsx, src/main.tsx, src/gateway/connectNotConfigured.ts (new, with test; the default for builds without a Connect client)
  - Do: Clusters get a fifth tab, Connect (`/clusters/<id>/connect`). It lists connectors in a table (connector, type, state, worker, tasks with id and state) and shows each failed connector's or task's error summary below its row. "Kafka Connect is not configured for this cluster" for 404 `connect_not_configured`, "Kafka Connect is unreachable" with Retry for 503 `connect_unreachable`, and the usual access messages otherwise. States are shown as text.
  - Done when: `npx vitest run src/gateway/listConnectors.test.ts src/components/ConnectConnectors.test.tsx src/components/ClusterTabs.test.tsx` passes, covering the table, error summaries, not configured and unreachable with Retry; then `npm test` and `npm run build` pass.

## Review
