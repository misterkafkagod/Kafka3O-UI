# P02 · F1-B2 — Healthy cluster shows its ID and broker count
- **Milestone:** M1
- **Covers:** F1-AC2
- **Discovery:** —
- **Status:** Building        <!-- Planned | Building | Review | Done -->

## Demo
0. If Docker is remote, open a tunnel: `ssh -N -L 8081:localhost:8081 -L 8082:localhost:8082 you@docker-host`.
1. In `Kafka3O-Gateway`, run `docker compose -f deploy/compose.dev.yaml up -d --build`.
2. `curl -s localhost:8081/api/v1/cluster` → JSON with a `clusterId`, `"controllerId":1` and one broker; port 8082 shows a different `clusterId`.
3. In `Kafka3O-UI`, run `npm run dev` and open http://localhost:5173 → "Dev" and "Prod" cards each show **Healthy**, their cluster ID and **"1 broker"**.

## Tasks
- [x] **T02.1 Gateway skeleton: config and liveness** — Covers: TECH-SPEC Stack (Gateway), Testing (Gateway)
  - Files: go.mod (new), go.sum (new), .gitignore (new), cmd/gateway/main.go (new), internal/config/config.go (new), internal/config/load_config.go (new), internal/config/load_config_test.go (new), internal/httpapi/register_live.go (new), internal/httpapi/register_live_test.go (new), configs/config.example.yaml (new)
  - Do: Module `github.com/misterkafkagod/Kafka3O-Gateway`. Data-only `Config`: `http.listen` (default `:8080`), `http.cors.allowedOrigins`, `kafka.brokers`, `kafka.timeout` (default `5s`). `LoadConfig(path)` reads YAML via koanf, then `KAFKA3O_*` env overrides (`__` separates nested keys, e.g. `KAFKA3O_KAFKA__TIMEOUT`); error if `kafka.brokers` is empty or the named file is missing. `RegisterLive(api)` registers `GET /api/v1/health/live` → 200 `{"status":"ok"}` (Huma 2.39.1, `humago` adapter). `main.go` is the composition root: `-config` flag, slog JSON logger, graceful shutdown on SIGINT/SIGTERM.
  - Done when: `go test ./...` passes — defaults applied, env overrides YAML, empty brokers → error, missing file → error, live returns 200 with body — and `go build ./...` exits 0.

- [ ] **T02.2 `GET /api/v1/cluster` (healthy path)** — Covers: F1-AC2
  - Files: internal/cluster/cluster.go (new), internal/cluster/describe_cluster.go (new), internal/cluster/get_cluster.go (new), internal/cluster/get_cluster_test.go (new), internal/kafka/new_client.go (new), internal/kafka/describe_cluster.go (new), internal/httpapi/register_get_cluster.go (new), internal/httpapi/register_get_cluster_test.go (new), test/integration/describe_cluster_test.go (new), cmd/gateway/main.go
  - Do: `cluster.go` holds data-only `Cluster` and `Broker`. `cluster/describe_cluster.go` is the Kafka port (interface only). `kafka.NewClient(cfg)` builds a franz-go client from `kafka.brokers` (plaintext only in this phase). The kadm adapter implements `cluster.DescribeCluster` with `BrokerMetadata`, mapping to `cluster.Cluster` (`ID`, `ControllerID`, `Brokers{ID, Host, Port, Rack}`); no franz-go types leave `internal/kafka`. `GetCluster` depends on the port, applies the configured timeout to the context and sorts brokers by ID. `RegisterGetCluster(api, getCluster)` serves camelCase `{clusterId, controllerId, brokers:[{id, host, port, rack}]}`; errors use Huma's default problem response for now (`cluster_unreachable` mapping is P04).
  - Done when: `go test ./...` passes (fake port + `humatest`): GetCluster sorts brokers, GetCluster passes the deadline, route returns the JSON shape; and `go test -tags integration ./test/integration/...` passes `TestDescribeCluster_ReturnsClusterIDAndOneBroker` (testcontainers `modules/kafka`, `apache/kafka:4.3.1`).

- [x] **T02.3 CORS for the UI origin** — Covers: TECH-SPEC Stack (Gateway) CORS
  - Files: internal/httpapi/with_cors.go (new), internal/httpapi/with_cors_test.go (new), cmd/gateway/main.go
  - Do: `WithCORS(next, allowedOrigins)` wraps the mux, exact origin match (no `*`). Allowed origin → `Access-Control-Allow-Origin: <origin>`, `Vary: Origin`; `OPTIONS` preflight → 204 with `Allow-Methods: GET`, `Allow-Headers: Accept, Content-Type`. Unlisted origin → no CORS headers, request still served.
  - Done when: `go test ./internal/httpapi/...` passes — allowed origin gets headers, allowed preflight → 204, unlisted origin → no headers, no `Origin` → no headers.

- [ ] **T02.4 Dev stack: two clusters and two gateways** — Covers: TECH-SPEC Structure (`deploy/compose.dev.yaml`)
  - Files: Dockerfile (new), .dockerignore (new), deploy/compose.dev.yaml (new), deploy/dev/gateway-dev.yaml (new), deploy/dev/gateway-prod.yaml (new)
  - Do: Multi-stage Dockerfile (`golang:1.27.2` build → `gcr.io/distroless/static-debian12:nonroot`). Compose runs `kafka-dev` and `kafka-prod` (`apache/kafka:4.3.1`, single-node KRaft, node ID 1), `gateway-dev` on `8081:8080` and `gateway-prod` on `8082:8080`, each with its own config pointing at its cluster and allowing origin `http://localhost:5173`.
  - Done when: after `docker compose -f deploy/compose.dev.yaml up -d --build`, `curl -s localhost:8081/api/v1/cluster` returns JSON with `clusterId`, `"controllerId":1` and one broker; 8082 returns a different `clusterId`; `curl -si -H 'Origin: http://localhost:5173' localhost:8081/api/v1/cluster` includes `Access-Control-Allow-Origin: http://localhost:5173`.

- [ ] **T02.5 Cards show Healthy, cluster ID and broker count** — Covers: F1-AC2
  - Files: src/gateway/types.ts, src/gateway/getCluster.ts (new), src/gateway/getCluster.test.ts (new), src/hooks/useClusterStatus.ts (new), src/hooks/useClusterStatus.test.tsx (new), src/components/ClusterCard.tsx, src/components/ClusterCard.test.tsx, src/pages/ClustersPage.tsx, src/pages/ClustersPage.test.tsx, src/App.tsx, src/App.test.tsx, src/main.tsx
  - Do: `types.ts` adds `ClusterInfo` and `Broker`. `getCluster(fetchJson, gatewayUrl)` calls `GET {url}/api/v1/cluster`. `useClusterStatus(gateway, getCluster)` runs one query per gateway with key `["gateway", id, "cluster"]`. `ClusterCard` shows "Checking…" while loading; on success **Healthy**, the cluster ID and "1 broker" / "N brokers"; on failure a plain "Status unavailable" placeholder (refined in P03/P04). `getCluster` is injected from `main.tsx` through `App` and `ClustersPage` into `ClusterCard`.
  - Done when: `npm test` passes `ClustersPage.test.tsx › shows Healthy, cluster ID and 3 brokers (F1-AC2)` (MSW fake gateway at `http://localhost:8081` with 3 brokers), plus `getCluster.test.ts`, `useClusterStatus.test.tsx` and the P01 tests; `npm run build` exits 0.

## Review
