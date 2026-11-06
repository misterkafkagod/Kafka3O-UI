# Technical Spec

Covers both repositories: **Kafka3O-Gateway** (one per Kafka cluster) and **Kafka3O-UI** (one UI talking to all gateways). The browser calls each gateway directly over HTTPS with CORS.

## Policies
- Project type: Open source (Apache-2.0) · CVE policy: zero unpatched critical/high in shipped dependencies

## Stack
### Gateway (Kafka3O-Gateway)
- Runtime: Go 1.27.3 — small static binary, strong concurrency, continuity with the earlier attempt; CVE status: `govulncheck` v1.9.0 2026-11-05: 0 called vulnerabilities. This version fixes GO-2026-6809 / CVE-2026-111943 in `crypto/x509`.
- Kafka client: franz-go v1.22.2 + kadm v1.19.0 — pure Go, complete admin API (metadata, start/end offsets); CVE status: `govulncheck` v1.9.0 2026-10-20: 0 affecting
- HTTP: Huma v2.39.1 on the stdlib `net/http` mux — typed handlers, OpenAPI 3.1 generated from code, RFC 9457 problem errors; CVE status: `govulncheck` v1.9.0 2026-10-20: 0 affecting
- Module path: `github.com/misterkafkagod/Kafka3O-Gateway`
- Config: koanf v2.3.8 with providers/file v1.2.1, providers/env/v2 v2.0.2, parsers/yaml v1.1.1 (YAML file + `KAFKA3O_*` env overrides, `__` separates nested keys; secrets only from env) — v2.4.1 released 2026-10-18, not adopted yet; CVE status: `govulncheck` v1.9.0 2026-10-20: 0 affecting
- Container images: `golang:1.27.3` (build), `gcr.io/distroless/static-debian12:nonroot` (runtime), `apache/kafka:4.3.1` (dev/test); CVE status: the current gateway image was built on EKS-D with Kaniko and scanned with Trivy 0.75.0 on 2026-11-05: 0 critical/high in the Debian packages and Go binary. Lower/unknown severities were not included. The image was not pushed or started as a container. The `golang` and `apache/kafka` images have not been scanned (build/dev only).
- Logging: stdlib `log/slog` (JSON)
- Kafka security: plaintext by default; optional verified TLS 1.2+ and SASL PLAIN, SCRAM-SHA-256 or SCRAM-SHA-512. A configured PEM CA bundle replaces system roots; SASL passwords come only from the environment. Mutual TLS client certificates are not supported.
- Gateway HTTP security (M5): the gateway itself terminates TLS using deployment-supplied certificate/key files and requires a strong per-gateway bearer token from the environment; anonymous liveness and allowed-origin CORS preflight are the only exceptions. A token grants all API permissions, with no user identity or roles.
- CORS: allowed origins from config (`http.cors.allowedOrigins`)
- Rejected: Java/Spring — heavier runtime than a per-cluster sidecar needs
- Rejected: confluent-kafka-go — cgo/librdkafka complicates builds
- Rejected: sarama — weaker admin API
- Rejected: gin/echo — no OpenAPI generated from types

### UI (Kafka3O-UI)
- Runtime: Node 24.21.0 LTS for build and test; CVE status: pending runtime scan (`npm audit` covers packages, not Node itself)
- Language/framework: TypeScript 7.0.2, React 19.3.1, Vite 8.3.4; CVE status: `npm audit` 2026-11-06: 0 findings
- Routing: React Router 8.4.0; CVE status: `npm audit` 2026-11-06: 0 findings
- Type definitions (dev): @types/react 19.3.0, @types/react-dom 19.3.0; CVE status: `npm audit` 2026-11-06: 0 findings
- Data fetching: TanStack Query 5.104.4 — one independent query per gateway with its own polling, timeout, error state and retry, so one slow gateway never blocks another; CVE status: `npm audit` 2026-11-06: 0 findings
- Styling: CSS Modules for component styles, with minimal global styles for typography, theme tokens and baseline normalization; no new styling dependency
- Rejected: Next.js — a static SPA suffices; no server needed
- Rejected: MUI / Tailwind — unnecessary weight for M1
- Rejected: BFF aggregating gateways — adds a stateful hop; direct browser → gateway with CORS is simpler

## Conventions
- SOLID: all five principles; dependencies injected as abstractions (Go: constructor arguments; TS: function parameters)
- One method per file: one class (or function) with one method, no private helpers (helpers are their own files, injected)
- Naming (Go): file named after the action — `list_topics.go` → interface `ListTopics` with `Execute(ctx)`, unexported struct `listTopics`, constructor `NewListTopics(deps)`
- Naming (TS): `listTopics.ts` → exported function type `ListTopics` and `export function listTopics(gateway, clusterId)`; components and hooks likewise (`TopicTable.tsx` → `TopicTable`, `useTopics.ts` → `useTopics`)
- Injection scope: I/O and side-effecting actions are always injected; pure functions without I/O and child components may be imported directly
- Inline functions: named logic (transforms, comparators, predicates, mappers) lives in its own file with its own test. Only logic-free framework glue may be inline: an HTTP handler closure that just calls an injected action, a JSX `.map` render callback, composition-root wiring
- Exempt: data-only types (DTOs, records, enums, TS types); test files (`list_topics_test.go`, `listTopics.test.ts`; many tests each); the composition root and test helpers need no own test file (covered by build and demo)
- Patterns: Ports and adapters (light) — actions depend on Kafka interfaces, franz-go lives only in `internal/kafka`; solves unit testing without a broker
- Patterns: Composition root — wiring only in `cmd/gateway/main.go` and `src/main.tsx`; solves assembling the mandatory DI in one place
- Rules (Gateway): HTTP handlers never see franz-go types; adapters map to DTOs
- Rules (Gateway): every Kafka call uses the request `ctx` with the configured timeout (default 3 s), which must stay below the UI's gateway timeout (5 s)
- Rules (Gateway): errors are problem JSON with a stable `code` (`cluster_unreachable`, `not_found`, …), built as `httpapi.Problem` (embeds `huma.ErrorModel`, adds `code`)
- Rules (Gateway): no state survives a restart
- Rules (UI): components never call `fetch`; all I/O goes through the injected `FetchJson` (`src/gateway/fetchJson.ts`)
- Rules (UI): gateway query keys start with `["gateway", gatewayId]`
- Rules (UI): the gateway list comes only from runtime `/config.json`, never build-time env, so one build serves any deployment
- Rules (UI): the static host serves `index.html` for client routes (`/clusters/*`); Vite dev already does
- Rules (M5): tokens are stored in browser session storage for the configured HTTPS gateway only, never in URLs or runtime config; the UI must run in a secure context, authenticated redirects are rejected, and credential changes clear gateway query caches

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
└── spec/README.md                   # points to Kafka3O-UI/spec/

Kafka3O-UI/
├── public/config.json               # {"gateways":[{"id":"dev","name":"Dev","url":"https://localhost:8081"}]}
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

## UI experience (M6–M8)
- Direction: a restrained operator console for developers and operators, with neutral surfaces, blue primary actions, compact readable tables, consistent spacing and a clear typographic hierarchy. Status labels include text and never rely on color alone.
- Themes and motion: follow `prefers-color-scheme` for light/dark presentation and `prefers-reduced-motion` for optional motion. No separate theme-persistence mechanism is required.
- Scope: M6 supplies the shell, shared visual baseline and connection panel across all current routes; M7 reorganizes cluster/topic/message investigation; M8 reorganizes consumer and write workflows. Completed F1–F14 behavior remains the baseline throughout.
- Components: extract only elements with actual reuse, such as navigation, breadcrumbs, page headers, controls and state feedback. Keep styles next to their components in the existing source structure; do not introduce a general-purpose component framework or speculative abstractions.
- Semantics: use native links, buttons, form labels, headings, landmarks and tables. Dialogs must provide accessible naming, initial/contained focus, Escape/close behavior and focus restoration; prefer native browser facilities where suitable.
- Connection management: move credential entry out of the permanently expanded global header into a dedicated dialog/panel available from the shell and contextual authentication prompts. Preserve the existing per-gateway session-storage lifecycle and cache resets.
- States: distinguish loading, missing configuration, empty data, no matches, authentication errors and gateway/cluster failures. Preserve partial cross-cluster results and error-before-stale-data checks; never fabricate zero values or healthy status.
- Transport guidance: browsers may not distinguish certificate failures from other transport errors. Provide network/TLS troubleshooting without asserting an unavailable diagnosis or adding a certificate bypass.
- Contracts: preserve current routes and message links, runtime configuration, API shapes, exact decimal offsets, the 50-record read bound, the 500-position search bound, polling and timeout behavior, and all existing write-confirmation/no-automatic-retry safeguards.
- Dependencies and conventions: retain the exact existing stack and all existing SOLID, injection, file naming and one-action-per-file rules. No dependency or backend change is approved for the redesign; no new vulnerability-scan result is claimed by this planning update.
- Delivery: verify each completed UX milestone on the updated EKS-D manual deployment, not just against a local build. Preserve the two persistent Kafka clusters, broker volumes and existing access endpoints; writes used for verification must use explicitly scoped synthetic test data.

## Testing
### Gateway
- Framework: Go `testing` + go-cmp · Fakes: hand-written interface fakes for Kafka ports
- Unit: go-cmp v0.7.0; HTTP routes via Huma `humatest`
- Vulnerability scan: `CGO_ENABLED=0 go run golang.org/x/vuln/cmd/govulncheck@v1.9.0 -test -tags integration ./...` (include tests: testcontainers pulls its own dependencies); 2026-11-05 with Go 1.27.3: 0 called vulnerabilities and 1 uncalled module-level advisory (GO-2026-5932, golang.org/x/crypto/openpgp; the module is required only by integration test tooling, not the gateway binary)
- Integration: core testcontainers-go v0.44.0 with `apache/kafka:4.3.1`, started by `test/integration/start_kafka.go`. The default fixture requires a Docker-compatible runtime; a guarded external mode also supports a disposable loopback-forwarded broker, with one integration test per process and a fresh broker per test. See `Kafka3O-Gateway/test/integration/README.md`.
- Rejected: testcontainers `modules/kafka` — v0.44.0 only starts Confluent images; `confluent-local` — different distribution than the dev stack; `kfake` — not a real broker
- Remote Docker (current dev setup: `docker-host`, 192.168.1.194, SSH only): forward the daemon socket with `ssh -nNT -o ExitOnForwardFailure=yes -o StreamLocalBindUnlink=yes -L $HOME/.docker/docker-host.sock:/var/run/docker.sock docker-host`, then `source ~/.docker/docker-host.env` (`DOCKER_HOST=unix://$HOME/.docker/docker-host.sock`, `TESTCONTAINERS_HOST_OVERRIDE=192.168.1.194`, `TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock`); Ryuk stays enabled. Not `ssh://` contexts — testcontainers-go doesn't reliably support them. Demo ports: `ssh -nNT -L 8081:localhost:8081 -L 8082:localhost:8082 docker-host`
- Compose uses read-only certificate/key bind mounts that resolve on the Docker host, including when it is remote. Provision them there with nonroot-readable permissions; all other service settings use environment variables. See `Kafka3O-Gateway/deploy/README.md`.
- Run: `go test ./...` (unit) · `CGO_ENABLED=0 go test -tags integration ./test/integration/... ./cmd/gateway ./internal/kafka` (Docker-backed integration; cgo off avoids linking macOS frameworks, which fails with mismatched Command Line Tools)
- Verification on 2026-11-05: existing broker tests, authenticated HTTPS write lifecycle, empty/mixed partitions, transaction markers, bounded snapshot fetches over genuinely compacted offsets, and TLS/SASL security modes passed against disposable EKS-D Kafka pods. The production gateway binary also returned secured cluster metadata over trusted HTTPS inside a pod. The gateway image was built and scanned, but not started as a container. The original Docker-only stopped-broker test remains unrun.

### UI
- Framework: Vitest 5.0.5, Testing Library (react 16.3.3, user-event 14.6.8, dom 10.4.2), jsdom 30.1.3 · Fakes: MSW 3.0.3, one handler set per fake gateway (`onUnhandledFrame: "error"`) · CVE status: `npm audit` 2026-11-05: 0 findings
- Run: `npm test`
- M5 verification: tests, build and `npm audit` passed on 2026-11-04. On 2026-11-05, all 268 tests and the build also passed in a disposable EKS-D pod running the declared Node 24.21.0; these UI tests use mocked gateway responses.
- M6–M8 validation: run focused component tests for changed behavior first, then `npm test` and `npm run build` on the declared Node runtime. Continue using the existing Testing Library/MSW stack; no new test dependency is approved.
- Browser acceptance: inspect the affected pages at 320, 768 and 1440 CSS pixels, in system light/dark themes and at 200% zoom. Verify table overflow containment, keyboard order, visible focus, dialog focus restoration, reduced-motion behavior and the stated contrast thresholds; record measurements rather than inferring accessibility from a screenshot.
- Regression acceptance: retain direct routes and exact-message links, per-gateway isolation, partial results, session-only credentials, explicit unknown states and write protections. Exercise real gateway read flows on EKS-D; any write demo uses scoped synthetic data and preserves existing broker data.
- Completion evidence: confirm the updated build is served at the EKS-D manual-test URL and record browser/demo outcomes in each phase review. Checks not executed remain `not run`; screenshot review alone does not establish keyboard, accessibility or Kafka behavior.

## Integrations
### Kafka (behind each gateway)
- Source: known Kafka admin API; secured broker setup was verified in [P13 discovery](./discovery/kafka-tls-scram-dev.md).
- Admin API via franz-go/kadm: metadata (brokers, controller, cluster ID, topics, internal flag), ListStartOffsets / ListEndOffsets for approximate message counts
- Security: verified TLS and/or SASL PLAIN/SCRAM; see `Kafka3O-Gateway/deploy/README.md` for CA, username and environment-only password configuration.

### Gateway HTTP API v1 (consumed by the UI)
- Base URL: per gateway, from the UI's `/config.json`; M5 requires HTTPS and an `Authorization: Bearer` token for all requests except anonymous liveness and allowed-origin CORS preflight
- `GET /api/v1/health/live` → 200 while the process is up
- `GET /api/v1/cluster` → `{clusterId, controllerId, brokers:[{id, host, port, rack}]}`; 503 `cluster_unreachable` when Kafka is unreachable
- `GET /api/v1/topics` → `[{name, partitions, replicationFactor, internal, approxMessages}]`; 503 `cluster_unreachable`
- `GET /api/v1/topics/{topic}` → `{name, partitions:[{id, leader, replicas, isr, startOffset, endOffset}], config:[{name, value, sensitive}]}`; sensitive config values are not sent, 404 `not_found` when the topic is absent, 503 `cluster_unreachable` for Kafka failures
- `GET /api/v1/topics/{topic}/messages` → at most 50 `{partition, offset, offsetExact, timestamp, key, value, headers:[{key, value}]}` records across the topic, newest first by default; `offsetExact` is the decimal string for the existing numeric `offset`, preserving int64 precision in browsers, and Kafka byte fields are base64 strings or `null` for Kafka nulls. Optional `partition` plus exactly one of `offset` or `timestamp` reads from that position in offset order (`timestamp` is Unix milliseconds); invalid positions return 400 `invalid_position`, a missing topic returns 404 `not_found`, and Kafka failures return 503 `cluster_unreachable`
- `GET /api/v1/topics/{topic}/messages/search?query=<text>` → `{messages, scanned, truncated}`; searches case-sensitive UTF-8 query bytes in keys and values over at most 500 recent offset positions across the topic. `scanned` is the number of records examined, and `truncated` indicates positions or partitions outside the bounded window. Offset order and timestamps are not globally correlated; the window is not a claim of the newest 500 by timestamp. Empty or invalid UTF-8 search returns 400 `invalid_search`; missing topics return 404 `not_found` and Kafka failures 503 `cluster_unreachable`.
- `POST /api/v1/topics/{topic}/messages` accepts `{value: string, key?: string, headers?: [{key: string, value: string}]}` as UTF-8 JSON. Empty values and keys are allowed; omitted key differs from an empty key. Acknowledged delivery returns `{partition: number, offset: string}` with an exact decimal offset. Invalid requests are rejected; 503 `delivery_unknown` means the message may already have been written and must not be automatically retried. The dedicated producer does not automatically retry records.
- `GET /api/v1/consumer-groups` → consumer groups with `id`, `protocol`, `state`, `members`, `topics`, and per-topic/partition offsets and lag. Offsets and lag are decimal strings or `null` to preserve int64 precision. Partition status is `ok`, `no_commit`, `out_of_range`, or `unavailable`; an unavailable partition or group includes an explicit error. Topic membership is based on explicit subscription, current assignment, or committed offset. List/describe classic and next-generation consumer groups using Kafka 3.8+ group-type filtering.
- `POST /api/v1/topics` accepts `{name: string, partitions: number, replicationFactor: number}` and returns 201 with those fields on broker acknowledgement. Topic names use 1–249 ASCII letters, digits, `.`, `_` or `-` and cannot be `.` or `..`; counts must be positive int32 and int16 respectively. Invalid input returns 400/422, duplicates return 409 `topic_exists`, and 503 `topic_write_unknown` means creation may already have succeeded. Administrative writes are not automatically retried.
- `DELETE /api/v1/topics/{topic}` returns 202 `{name, status: "accepted"}` when the broker accepts deletion; completion can be asynchronous. Invalid names return 400, missing topics 404 `not_found`, and 503 `topic_write_unknown` means deletion may already have succeeded. Neither gateway nor UI automatically retries.
- Errors: RFC 9457 problem JSON with `code`
- OpenAPI document served at `/openapi.json`
- UI timeout per gateway call: 5 s; status polling every 15 s; gateway Kafka timeout 3 s (must stay below the UI timeout)
