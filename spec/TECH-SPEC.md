# Technical Spec

Covers both repositories: **Kafka3O-Gateway** (one per Kafka cluster) and **Kafka3O-UI** (one UI talking to all gateways). The browser calls each gateway directly over HTTP with CORS.

## Policies
- Project type: Open source (Apache-2.0) · CVE policy: zero unpatched critical/high in shipped dependencies

## Stack
### Gateway (Kafka3O-Gateway)
- Runtime: Go 1.27.2 — small static binary, strong concurrency, continuity with the earlier attempt; CVE status: pending scan
- Kafka client: franz-go v1.22.2 + kadm v1.19.0 — pure Go, complete admin API (metadata, start/end offsets); CVE status: pending scan
- HTTP: Huma v2.39.1 on the stdlib `net/http` mux — typed handlers, OpenAPI 3.1 generated from code, RFC 9457 problem errors; CVE status: pending scan
- Config: koanf v2.3.8 (YAML file + `KAFKA3O_*` env overrides; secrets only from env) — v2.4.1 released 2026-10-18, not adopted yet; CVE status: pending scan
- Logging: stdlib `log/slog` (JSON)
- Kafka security supported from M1: PLAINTEXT, TLS, SASL PLAIN, SCRAM-SHA-256/512
- CORS: allowed origins from config (`http.cors.allowedOrigins`)
- Rejected: Java/Spring — heavier runtime than a per-cluster sidecar needs
- Rejected: confluent-kafka-go — cgo/librdkafka complicates builds
- Rejected: sarama — weaker admin API
- Rejected: gin/echo — no OpenAPI generated from types

### UI (Kafka3O-UI)
- Runtime: Node 24.21.0 LTS; CVE status: pending scan
- Language/framework: TypeScript 7.0.2, React 19.3.1, React Router 8.4.0, Vite 8.3.4; CVE status: pending scan
- Data fetching: TanStack Query 5.104.4 — one independent query per gateway with its own polling, timeout, error state and retry, so one slow gateway never blocks another; CVE status: pending scan
- Styling: plain CSS modules
- Rejected: Next.js — a static SPA suffices; no server needed
- Rejected: MUI / Tailwind — unnecessary weight for M1
- Rejected: BFF aggregating gateways — adds a stateful hop; direct browser → gateway with CORS is simpler

## Conventions
- SOLID: all five principles; dependencies injected as abstractions (Go: constructor arguments; TS: function parameters)
- One method per file: one class (or function) with one method, no private helpers (helpers are their own files, injected)
- Naming (Go): file named after the action — `list_topics.go` → interface `ListTopics` with `Execute(ctx)`, unexported struct `listTopics`, constructor `NewListTopics(deps)`
- Naming (TS): `listTopics.ts` → exported function type `ListTopics` and `export function listTopics(gateway, clusterId)`; components and hooks likewise (`TopicTable.tsx` → `TopicTable`, `useTopics.ts` → `useTopics`)
- Exempt: data-only types (DTOs, records, enums, TS types); test files (`list_topics_test.go`, `listTopics.test.ts`; many tests each)
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
├── deploy/compose.dev.yaml          # 2 Kafka clusters + 2 gateways for the local multi-cluster demo
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
- Integration: testcontainers-go v0.44.0 with `apache/kafka:4.3.1` (requires Docker)
- Run: `go test ./...` (unit) · `go test -tags integration ./test/integration/...` (integration)

### UI
- Framework: Vitest 5.0.5, Testing Library (react 16.3.3, user-event 14.6.8), jsdom 30.1.3 · Fakes: MSW 3.0.3, one handler set per fake gateway
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
