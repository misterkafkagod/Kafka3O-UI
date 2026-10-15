# Spec

## Product
### F1 — Gateway and cluster status
**Behavior**
- User opens the app → a status bar shows the gateway as up/down and the cluster as reachable/unreachable, separately.
- User opens the Cluster page → sees the cluster id, the controller, and a broker list (id, host, port, rack).
- Gateway is running but Kafka is unreachable → gateway shows "up", cluster shows "unreachable" with the error. Other pages show a clear "cluster unreachable" message instead of failing silently.
- UI can't reach the gateway → a full-page "gateway unreachable" message with a retry button.
- There is no authentication yet (added by F10). The gateway is meant for local or trusted networks only.

**Acceptance criteria**
- **F1-AC1** Given a healthy cluster, when the user opens the app → status shows gateway up and cluster reachable.
- **F1-AC2** Given the gateway is running and Kafka is stopped, when the status is checked → gateway is up and cluster is unreachable with an error message, within 10 s.
- **F1-AC3** Given a 3-broker cluster, when the user opens the Cluster page → all 3 brokers are listed with id, host, and port, and the controller is marked.
- **F1-AC4** Given the gateway is stopped, when the user opens the UI → a "gateway unreachable" message with a retry button appears.

**External dependencies:** Kafka cluster. Gateway tests run against a real, disposable Kafka; UI tests fake the gateway API.

### F2 — Topic list
**Behavior**
- User opens Topics → a table of topics with name, partition count, and ≈ message count, sorted by name.
- The ≈ message count is the sum over partitions of (end offset − start offset). It is labelled "≈" because compaction and transaction markers make it inexact.
- User types in a filter box → the list narrows by name (case-insensitive substring).
- Internal topics (names starting with `_`, e.g. `__consumer_offsets`) are hidden unless "show internal" is on.
- The cluster has no topics → an empty state ("No topics yet").

**Acceptance criteria**
- **F2-AC1** Given topics `orders` (3 partitions, 10 messages) and `users` (1 partition, 0 messages), when the user opens Topics → both appear with partitions 3 and 1, and counts ≈10 and 0.
- **F2-AC2** Given those topics, when the user types `ORD` → only `orders` is shown.
- **F2-AC3** Given the cluster has `__consumer_offsets`, when the page loads → it's hidden, and turning on "show internal" makes it appear.
- **F2-AC4** Given no user topics, when the user opens Topics → "No topics yet" is shown.

**External dependencies:** Kafka cluster (as F1).

### F3 — Topic details
**Behavior**
- User clicks a topic → a details page with a partitions table (id, leader, replicas, in-sync replicas, start offset, end offset) and the topic's config (key, value, and whether it's the default or overridden).
- Partitions where in-sync replicas < replicas are highlighted as under-replicated.
- The topic doesn't exist (bad link, or deleted meanwhile) → a "Topic not found" page.

**Acceptance criteria**
- **F3-AC1** Given `orders` with 3 partitions, when the user opens it → 3 partition rows with leader, replicas, in-sync replicas, and start/end offsets that match Kafka.
- **F3-AC2** Given `orders` has `retention.ms` overridden, when the config section loads → `retention.ms` shows its value and is marked as overridden, and other keys are marked as default.
- **F3-AC3** Given a partition whose in-sync replicas are fewer than its replicas, when the page loads → that row is flagged as under-replicated.
- **F3-AC4** Given the user navigates to `/topics/missing`, when the page loads → "Topic not found" is shown.

**External dependencies:** Kafka cluster (as F1).

### F4 — Read latest messages
**Behavior**
- On the topic page, the user opens Messages → the newest 50 messages across all partitions, newest first. Each row shows partition, offset, timestamp, key, value preview, and the number of headers.
- User expands a message → full key, value, and headers.
- Values and keys are displayed as JSON if they parse as JSON, otherwise text if valid UTF-8, otherwise base64. The user can switch format per message.
- User changes the limit → the list reloads. The limit is capped at 500; a higher request is reduced to 500.
- Values over 64 KB are cut at 64 KB and marked "truncated".
- Reading never commits offsets or creates a consumer group on the cluster.
- The topic is empty → "No messages".

**Acceptance criteria**
- **F4-AC1** Given `orders` has 120 messages, when the user opens Messages → 50 are shown, newest timestamp first.
- **F4-AC2** Given the user sets the limit to 500, when the topic has 1,000 messages → exactly 500 are shown. A requested limit above 500 is capped at 500.
- **F4-AC3** Given a message whose value is `{"id":1}`, when expanded → it's shown as formatted JSON. Given a non-UTF-8 value → base64. Given plain text → text.
- **F4-AC4** Given a message with headers `trace-id=abc`, when expanded → the header is shown.
- **F4-AC5** Given a 100 KB value, when shown → it's cut at 64 KB and marked "truncated".
- **F4-AC6** Given the user reads messages, when the cluster's consumer groups are listed afterwards → no new group exists and no offsets were committed.
- **F4-AC7** Given an empty topic, when Messages opens → "No messages" is shown.

**External dependencies:** Kafka cluster (as F1).

## Technical
### Policies
- Project type: Open source (repo LICENSE) · dependencies must have OSI-approved licenses
- CVE policy: no unpatched critical/high findings; medium/low are tracked
- Integration tests needing containers run in CI only (no local container runtime)

### Stack
Gateway (Kafka3O-Gateway):
- Language: Go 1.27.2 — current stable; CVE status: none known in OSV (2026-10-13), pending scan
- Kafka client: github.com/twmb/franz-go v1.22.2 + pkg/kadm v1.19.0 — pure Go, maintained, direct partition reads without a consumer group; CVE status: none known in OSV, transitive pending scan
- HTTP / logging / JSON: standard library (`net/http` routing, `log/slog`, `encoding/json`)
- Integration testing: github.com/testcontainers/testcontainers-go v0.44.0 (core only), image `apache/kafka:4.3.1` started by the `internal/kafka/kafkatest` helper; CVE status: none known in OSV, image pending scan
  - The testcontainers Kafka module was dropped: its start script only works with Confluent's `confluent-local` image.

UI (Kafka3O-UI):
- Node 24.21.0 LTS (build-time only), npm
- react / react-dom 19.3.0, typescript 6.0.3 (strict), vite 8.3.4, @vitejs/plugin-react 6.1.2, react-router 7.18.4
- Testing: vitest 4.1.11, jsdom 30.1.2, @testing-library/react 16.3.3 (+ @testing-library/dom ^10), @testing-library/user-event 14.6.8, msw 2.15.0
- CVE status: direct packages none known in OSV (2026-10-13); transitive pending scan

Vulnerability scanning: govulncheck v1.9.0 (gateway), `npm audit` (UI), run at cycle review.

Rejected:
- sarama / confluent-kafka-go — confluent needs cgo; franz-go is the cleaner pure-Go client
- huma / koanf — no OpenAPI generation needed yet; environment variables suffice for config
- TypeScript 7, vitest 5, msw 3, react-router 8 — too recent (weeks to a few months)
- TanStack Query — one small fetch hook covers four pages
- Next.js — requires a Node server; the UI is static files
- Tailwind / component libraries — plain CSS is enough
- Playwright E2E — deferred; the manual demo covers end-to-end this cycle

### Architecture
- Dev: Vite dev server proxies `/api` to the gateway on `:8080`. Prod: the gateway serves the built UI from `KAFKA3O_UI_DIR`. Same origin, no CORS.
- Gateway config (env): `KAFKA3O_BROKERS` (required), `KAFKA3O_LISTEN` (default `:8080`), `KAFKA3O_UI_DIR` (optional).
- No authentication until F10; local or trusted networks only.

API contract (JSON):

| Endpoint | Response |
|---|---|
| `GET /api/health` | `{gateway:"up", cluster:{reachable, error?}}` — Kafka check times out after 3 s; the UI polls every 5 s |
| `GET /api/cluster` | `{clusterId, controllerId, brokers:[{id, host, port, rack}]}` |
| `GET /api/topics` | `[{name, partitions, approxMessages, internal}]` — all topics; the UI filters and hides internal ones (`internal` = name starts with `_`) |
| `GET /api/topics/{name}` | `{name, partitions:[{id, leader, replicas, isr, startOffset, endOffset, underReplicated}], configs:[{key, value, isDefault, sensitive}]}` — sensitive values are never sent |
| `GET /api/topics/{name}/messages?limit=50` | `{limitApplied, messages:[{partition, offset, timestamp, key, value, headers:[{key, value}]}]}` — each key/value/header value is `{encoding:"json"\|"text"\|"base64", data, size, truncated}` |
| Errors | `{error:{code, message}}` — 404 `topic_not_found`, 503 `cluster_unreachable`, 400 `invalid_request` |

Read latest: per partition, seek to `max(start, end − limit)` and read to the end; merge, sort newest first, keep `limit` (cap 500). Scan time limit 5 s. Values are truncated at 64 KB. No offsets are committed and no consumer group is joined. Format detection (JSON → text → base64) happens in the gateway; the UI re-encodes loaded data when the user switches format.

### Conventions
- Patterns: `Cluster` interface between HTTP handlers and Kafka — solves unit-testing handlers without a real Kafka. No other patterns.
- Rules:
  - Only `internal/kafka` imports franz-go; handlers depend on the `Cluster` interface.
  - Every Kafka call gets a `context` with a timeout; no package-level state, config passed through constructors.
  - Errors are mapped to HTTP responses in one function (`writeError`).
  - UI components never call `fetch`; only `src/api` does. Pages load data; components only display it.
  - TypeScript strict mode, no `any`.

### Structure
```
Kafka3O-Gateway/
  cmd/kafka3o-gateway/main.go
  internal/config/          env config
  internal/kafka/           franz-go adapter (implements Cluster)
  internal/api/             HTTP handlers, Cluster interface, writeError
  internal/msgfmt/          format detection and truncation
  internal/kafka/kafkatest/ starts a disposable apache/kafka container (integration tests only)
  *_test.go                 unit tests next to code
  *_integration_test.go     build tag `integration`
  .github/workflows/ci.yml

Kafka3O-UI/
  src/api/                  client.ts, types.ts
  src/pages/                ClusterPage, TopicsPage, TopicPage, MessagesTab
  src/components/           StatusBar, ...
  src/format/               format switching
  src/test/                 msw handlers, test setup
  *.test.tsx                tests next to code
  vite.config.ts, .nvmrc
  .github/workflows/ci.yml
```

### Testing
- Gateway: standard `testing` package. Unit = handlers against a fake `Cluster`, plus `msgfmt`. Integration = `kafkatest.Start` (core testcontainers, `apache/kafka:4.3.1`) behind the `integration` build tag, CI only.
  - Run: `go test ./...` (local) · `go test -tags=integration ./...` (CI)
- UI: vitest + jsdom + Testing Library; the gateway API is faked with msw. No integration tests (the UI only talks to the gateway).
  - Run: `npm test` and `npm run typecheck`
