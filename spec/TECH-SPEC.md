# Technical Spec

Covers both repositories: **Kafka3O-Gateway** (one per Kafka cluster) and **Kafka3O-UI** (one UI talking to all gateways). The browser calls each gateway directly over HTTP with CORS.

## Policies
- Project type: Open source (Apache-2.0) · CVE policy: zero unpatched critical/high in shipped dependencies

## Stack
### Gateway (Kafka3O-Gateway)
- Runtime: Go 1.27.2 — small static binary, strong concurrency, continuity with the earlier attempt; CVE status: pending scan
- Kafka client: franz-go v1.22.2 + kadm v1.19.0 — pure Go, complete admin API (metadata, start/end offsets); CVE status: pending scan
- HTTP: Huma v2.39.1 on the stdlib `net/http` mux — typed handlers, OpenAPI 3.1 generated from code, RFC 9457 problem errors; CVE status: pending scan
- Module path: `github.com/misterkafkagod/Kafka3O-Gateway`
- Config: koanf v2.3.8 with providers/file v1.2.1, providers/env/v2 v2.0.2, parsers/yaml v1.1.1 (YAML file + `KAFKA3O_*` env overrides, `__` separates nested keys; secrets only from env) — v2.4.1 released 2026-10-18, not adopted yet; CVE status: pending scan
- Container images: `golang:1.27.2` (build), `gcr.io/distroless/static-debian12:nonroot` (runtime), `apache/kafka:4.3.1` (dev/test); CVE status: pending scan (no image scanner installed)
- Logging: stdlib `log/slog` (JSON)
- Kafka security supported from M1: PLAINTEXT, TLS, SASL PLAIN, SCRAM-SHA-256/512
- CORS: allowed origins from config (`http.cors.allowedOrigins`)
- Rejected: Java/Spring — heavier runtime than a per-cluster sidecar needs
- Rejected: confluent-kafka-go — cgo/librdkafka complicates builds
- Rejected: sarama — weaker admin API
- Rejected: gin/echo — no OpenAPI generated from types

### UI (Kafka3O-UI)
- Runtime: Node 24.21.0 LTS; CVE status: pending scan
- Language/framework: TypeScript 7.0.2, React 19.3.1, Vite 8.3.4; CVE status: `npm audit` 2026-10-18: 0 findings
- Routing: React Router 8.4.0; CVE status: pending scan (not installed yet)
- Type definitions (dev): @types/react 19.3.0, @types/react-dom 19.3.0; CVE status: `npm audit` 2026-10-18: 0 findings
- Data fetching: TanStack Query 5.104.4 — one independent query per gateway with its own polling, timeout, error state and retry, so one slow gateway never blocks another; CVE status: `npm audit` 2026-10-18: 0 findings
- Styling: plain CSS modules
- Rejected: Next.js — a static SPA suffices; no server needed
- Rejected: MUI / Tailwind — unnecessary weight for M1
- Rejected: BFF aggregating gateways — adds a stateful hop; direct browser → gateway with CORS is simpler

## Conventions
- SOLID: all five principles; dependencies injected as abstractions (Go: constructor arguments; TS: function parameters)
- One method per file: one class (or function) with one method, no private helpers (helpers are their own files, injected)
- Naming (Go): file named after the action — `list_topics.go` → interface `ListTopics` with `Execute(ctx)`, unexported struct `listTopics`, constructor `NewListTopics(deps)`
- Naming (TS): `listTopics.ts` → exported function type `ListTopics` and `export function listTopics(gateway, clusterId)`; components and hooks likewise (`TopicTable.tsx` → `TopicTable`, `useTopics.ts` → `useTopics`)
- Injection scope: I/O and side-effecting actions are always injected; pure functions without I/O and child components may be imported directly
- Exempt: data-only types (DTOs, records, enums, TS types); test files (`list_topics_test.go`, `listTopics.test.ts`; many tests each); the composition root and test helpers need no own test file (covered by build and demo)
- Patterns: Ports and adapters (light) — actions depend on Kafka interfaces, franz-go lives only in `internal/kafka`; solves unit testing without a broker
- Patterns: Composition root — wiring only in `cmd/gateway/main.go` and `src/main.tsx`; solves assembling the mandatory DI in one place
- Rules (Gateway): HTTP handlers never see franz-go types; adapters map to DTOs
- Rules (Gateway): every Kafka call uses the request `ctx` with the configured timeout (default 5 s)
- Rules (Gateway): errors are problem JSON with a stable `code` (`cluster_unreachable`, `not_found`, …)
- Rules (Gateway): no state survives a restart
- Rules (UI): components never call `fetch`; all I/O goes through the injected `FetchJson` (`src/gateway/fetchJson.ts`)
- Rules (UI): every query key starts with the gateway ID
- Rules (UI): the gateway list comes only from runtime `/config.json`, never build-time env, so one build serves any deployment

## Structure
```
Kafka3O-Gateway/
├── cmd/gateway/main.go              # composition root
├── internal/
│   ├── config/                      # load_config.go …
│   ├── kafka/                       # franz-go adapters: describe_cluster.go, list_topic_offsets.go …
│   ├── cluster/                     # get_cluster.go + cluster.go (DTO)
│   ├── topics/                      # list_topics.go + topic.go (DTO)
│   └── httpapi/                     # register_get_cluster.go, register_list_topics.go, cors.go …
├── test/integration/                # testcontainers tests, build tag `integration`
├── configs/config.example.yaml
├── Dockerfile
├── deploy/compose.dev.yaml          # 2 Kafka clusters + 2 gateways for the local multi-cluster demo
├── deploy/dev/                      # gateway-dev.yaml, gateway-prod.yaml
└── spec/README.md                   # points to Kafka3O-UI/spec/

Kafka3O-UI/
├── public/config.json               # {"gateways":[{"id":"dev","name":"Dev","url":"http://localhost:8081"}]}
├── src/
│   ├── main.tsx                     # composition root
│   ├── config/loadGatewayConfig.ts
│   ├── gateway/                     # fetchJson.ts, getCluster.ts, listTopics.ts, types.ts
│   ├── hooks/                       # useClusterStatus.ts, useTopics.ts
│   ├── pages/                       # ClustersPage.tsx, ClusterPage.tsx, TopicsPage.tsx
│   ├── components/                  # ClusterCard.tsx, BrokerTable.tsx, TopicTable.tsx
│   └── test/                        # MSW server.ts, setup.ts
└── spec/
    ├── ROADMAP.md
    ├── FUNC-SPEC.md
    ├── TECH-SPEC.md
    ├── phases/                      # NN-slug.md
    └── discovery/                   # <slug>.md
```
Tests live next to the file they test (`*_test.go`, `*.test.ts(x)`).

## Testing
### Gateway
- Framework: Go `testing` + go-cmp · Fakes: hand-written interface fakes for Kafka ports
- Unit: go-cmp v0.7.0; HTTP routes via Huma `humatest`
- Integration: core testcontainers-go v0.44.0 with `apache/kafka:4.3.1`, started by `test/integration/start_kafka.go` (requires a Docker-compatible runtime)
- Rejected: testcontainers `modules/kafka` — v0.44.0 only starts Confluent images; `confluent-local` — different distribution than the dev stack; `kfake` — not a real broker
- Remote Docker is fine: `docker context` over SSH, plus `TESTCONTAINERS_HOST_OVERRIDE=<host>` for integration tests (container ports must be reachable from the dev machine); demo ports via `ssh -N -L 8081:localhost:8081 -L 8082:localhost:8082 <host>`
- Run: `go test ./...` (unit) · `CGO_ENABLED=0 go test -tags integration ./test/integration/...` (integration; cgo off avoids linking macOS frameworks, which fails with mismatched Command Line Tools)

### UI
- Framework: Vitest 5.0.5, Testing Library (react 16.3.3, user-event 14.6.8, dom 10.4.2), jsdom 30.1.3 · Fakes: MSW 3.0.3, one handler set per fake gateway (`onUnhandledFrame: "error"`) · CVE status: `npm audit` 2026-10-18: 0 findings
- Run: `npm test`

## Integrations
### Kafka (behind each gateway)
- Source: known territory, no discovery needed
- Admin API via franz-go/kadm: metadata (brokers, controller, cluster ID, topics, internal flag), ListStartOffsets / ListEndOffsets for approximate message counts
- Security: PLAINTEXT, TLS, SASL PLAIN, SCRAM-SHA-256/512 from gateway config

### Gateway HTTP API v1 (consumed by the UI)
- Base URL: per gateway, from the UI's `/config.json`; no auth until F12 (M5) — trusted network assumed
- `GET /api/v1/health/live` → 200 while the process is up
- `GET /api/v1/cluster` → `{clusterId, controllerId, brokers:[{id, host, port, rack}]}`; 503 `cluster_unreachable` when Kafka is unreachable
- `GET /api/v1/topics` → `[{name, partitions, replicationFactor, internal, approxMessages}]`; 503 `cluster_unreachable`
- Errors: RFC 9457 problem JSON with `code`
- OpenAPI document served at `/openapi.json`
- UI timeout per gateway call: 5 s; status polling every 15 s
