# P04 · F1-B4 — Gateway up but Kafka down
- **Milestone:** M1
- **Covers:** F1-AC4
- **Discovery:** —
- **Status:** Planned        <!-- Planned | Building | Review | Done -->

## Demo
1. `docker compose -f deploy/compose.dev.yaml stop kafka-prod`.
2. `curl -si localhost:8082/api/v1/cluster` → 503 with `"code":"cluster_unreachable"` within ~3 s.
3. Reload the UI → "Prod" shows **Cluster unreachable** with the gateway's message.

## Tasks
- [ ] **T04.1 Gateway: 503 cluster_unreachable** — Covers: F1-AC4
  - Files: internal/httpapi/problem.go (new), internal/httpapi/new_cluster_unreachable.go (new), internal/httpapi/new_cluster_unreachable_test.go (new), internal/httpapi/register_get_cluster.go, internal/httpapi/register_get_cluster_test.go, internal/kafka/describe_cluster_test.go (new), internal/config/load_config.go, internal/config/load_config_test.go, configs/config.example.yaml
  - Do: `Problem` is data-only: embeds `huma.ErrorModel` (inherits `Error()`/`GetStatus()`, declares no methods) plus `Code string`. `NewClusterUnreachable(err)` → 503, title "Cluster unreachable", detail "Kafka is unreachable: <err>", code `cluster_unreachable`. `RegisterGetCluster` returns it on any `GetCluster` error and documents 503 in OpenAPI. Default `kafka.timeout` 5 s → 3 s so the gateway answers before the UI's 5 s timeout.
  - Done when: `go test ./...` passes: route → 503 with code and detail when GetCluster fails; NewClusterUnreachable fields; adapter against `127.0.0.1:1` with a 500 ms context errors within 2 s (no Docker); default timeout is 3 s.

- [ ] **T04.2 UI: card shows Cluster unreachable + message** — Covers: F1-AC4
  - Files: src/gateway/HttpError.ts (adds optional `problem: {code, detail}`), src/gateway/fetchJson.ts, src/gateway/fetchJson.test.ts, src/gateway/types.ts (adds `"cluster-unreachable"`), src/gateway/classifyGatewayError.ts (from T03.1), src/gateway/classifyGatewayError.test.ts (from T03.1), src/components/ClusterCard.tsx, src/components/ClusterCard.test.tsx, src/pages/ClustersPage.test.tsx
  - Do: On non-2xx, `fetchJson` tries to parse the problem body into `HttpError.problem` (unparsable → none). `classifyGatewayError` maps `problem.code === "cluster_unreachable"` → `cluster-unreachable`. Card shows **Cluster unreachable** and the detail.
  - Done when: `npm test` passes `ClustersPage` › "shows Cluster unreachable with the gateway message (F1-AC4)" (MSW 503 problem), fetchJson problem cases (valid, empty body, non-JSON), classify cluster-unreachable case; build exits 0.

## Review
