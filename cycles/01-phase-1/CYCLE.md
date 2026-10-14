# Cycle 01 · Phase 1 — A developer can browse topics and read messages end to end (UI → gateway → Kafka)
- **Type:** Phase
- **Status:** Planned
- **Features:** F1, F2, F3, F4

## Scope
- **Features:** F1, F2, F3, F4 (behaviors and criteria in SPEC.md)
- **Changes to existing behavior:** none (first cycle; SPEC.md is new)
- **Not in this cycle:** reading from a chosen partition, offset, or timestamp (F5); search (F6); message links (F7); consumer groups and lag (F8, F9); API key authentication (F10); producing messages (F11); live auto-refresh or tailing; any write operation.
- **Decisions taken at scope:**
  - Default read is the newest 50 messages; the limit is capped at 500; values over 64 KB are truncated.
  - Internal topics are hidden by default, with a toggle.
  - Display format is auto-detected (JSON → text → base64), switchable per message.
  - No authentication this cycle; the gateway is for local or trusted networks only.
  - "≈ message count" = sum of (end offset − start offset) over partitions.

## Design
Full Phase 1 design, recorded in SPEC.md `## Technical`. No POC, so no POC review.
- Policies: open source; no unpatched critical/high CVEs; container-based integration tests in CI only.
- Stack: Go 1.27.2 + franz-go v1.22.2 gateway (standard-library HTTP); React 19.3 + TypeScript 6.0.3 + Vite 8.3.4 UI on Node 24.21.0 LTS. Direct dependencies showed no known vulnerabilities in OSV on 2026-10-13; transitive scan pending.
- API contract: 5 JSON endpoints under `/api`, uniform error body; the gateway does format detection and truncation.
- One pattern: `Cluster` interface so handlers are unit-testable without Kafka.
- Prerequisites for build: install Go 1.27.2 and Node 24.21.0 (nothing is installed locally). The manual demo needs a reachable Kafka cluster.

## Plan
**Prerequisites:** Go 1.27.2 and Node 24.21.0 installed; a reachable Kafka cluster (`$BROKERS`) for the demos; the misterkafkagod SSH key added on GitHub so CI (integration tests) can run. Until then, integration tasks are verified only as far as `go vet -tags=integration ./...`.

**Known test limits:** a single-broker test container can't show 3 brokers (F1-AC3) or an under-replicated partition (F3-AC3); those are covered by unit tests with a fake `Cluster` and by UI tests. The seed tool writes to the cluster it is pointed at; it requires an explicit `-brokers` flag and only creates `orders`, `users`, and `empty`.

### Slice 1: A developer sees whether the gateway and cluster are up, and lists the brokers (F1)
**Demo**
1. In the Gateway repo, run `KAFKA3O_BROKERS=$BROKERS go run ./cmd/kafka3o-gateway`. Expect a log line `listening on :8080`.
2. In the UI repo, run `npm run dev` and open the URL it prints. Expect the status bar to show **Gateway: up · Cluster: reachable**.
3. Open **Cluster**. Expect the cluster id, every broker with id, host, and port, and the controller marked.
4. Restart the gateway with `KAFKA3O_BROKERS=localhost:1`. Within 10 s, expect **Cluster: unreachable** with an error, and the Cluster page to show "Cluster unreachable".
5. Stop the gateway. Expect a full-page "Gateway unreachable" message. Start it again and click **Retry**; expect the app to come back.

**Tasks**
- [ ] **T1.1 Gateway skeleton and config** — Covers: convention (config via constructors)
  - Files: go.mod (new), cmd/kafka3o-gateway/main.go (new), internal/config/config.go (new), internal/config/config_test.go (new)
  - Do: read `KAFKA3O_BROKERS` (required, comma-separated), `KAFKA3O_LISTEN` (default `:8080`), `KAFKA3O_UI_DIR` (optional). Exit with a clear message if brokers are missing. JSON `slog` logging. Graceful shutdown on SIGINT/SIGTERM.
  - Done when: `go test ./internal/config` passes cases *missing brokers → error*, *defaults applied*, *comma list split and trimmed*; `go build ./...` succeeds.
- [ ] **T1.2 Health and cluster endpoints** — Covers: F1-AC1, F1-AC2, F1-AC3
  - Files: internal/api/cluster.go (new; `Cluster` interface and types), internal/api/errors.go (new; `writeError`), internal/api/server.go (new; routes), internal/api/health.go (new), internal/api/health_test.go (new), internal/api/fake_test.go (new; fake `Cluster`)
  - Do: `GET /api/health` always returns 200 with `gateway:"up"`. The cluster check runs `Ping` with a 3 s timeout; on failure it returns `reachable:false` and the error text. `GET /api/cluster` returns cluster id, controller id, and brokers; if the cluster is unreachable it returns 503 `cluster_unreachable`.
  - Done when: `go test ./internal/api -run 'TestHealth|TestCluster'` passes cases *reachable*, *ping fails → reachable false with error*, *3 brokers with controller*, *describe fails → 503 with error body*.
- [ ] **T1.3 Kafka adapter: ping and describe cluster** — Covers: F1-AC2, F1-AC3
  - Files: internal/kafka/client.go (new), internal/kafka/client_integration_test.go (new, `integration` tag), cmd/kafka3o-gateway/main.go (edit)
  - Do: a franz-go client plus kadm implementing `Ping` and `DescribeCluster`. Every call takes a context with a timeout. Wire it into main.
  - Done when: `go vet -tags=integration ./...` passes locally. In CI, `go test -tags=integration ./internal/kafka -run 'TestDescribeCluster|TestPingUnreachable'` passes (*container → 1 broker and a controller*; *`localhost:1` → error within 3 s*).
- [ ] **T1.4 Gateway serves the built UI** — Covers: architecture (same origin)
  - Files: internal/api/static.go (new), internal/api/static_test.go (new), internal/api/server.go (edit)
  - Do: if `KAFKA3O_UI_DIR` is set, serve its files. Paths not under `/api` that don't match a file get `index.html`, so deep links work. Unknown `/api/*` paths return a JSON 404. Block path traversal.
  - Done when: `go test ./internal/api -run TestStatic` passes cases *file served*, *`/topics/x` → index.html*, *`/api/nope` → JSON 404*, *`/../etc/passwd` not served*.
- [ ] **T1.5 Gateway CI** — Covers: Testing (integration in CI)
  - Files: .github/workflows/ci.yml (new)
  - Do: on push and pull request, set up Go 1.27.2 and run a `gofmt -l` check (must be empty), `go vet ./...`, `go test ./...`, and `go test -tags=integration ./...`.
  - Done when: the workflow passes on GitHub for the pushed commit (`gh run list --limit 1` shows `completed success`).
- [ ] **T1.6 UI scaffold and API client** — Covers: convention (only `src/api` fetches)
  - Files: package.json (new), package-lock.json (new), tsconfig.json (new), vite.config.ts (new; `/api` proxy to `:8080`), index.html (new), .nvmrc (new), src/main.tsx (new), src/App.tsx (new), src/api/types.ts (new), src/api/client.ts (new), src/api/client.test.ts (new), src/test/setup.ts (new), src/test/server.ts (new; msw)
  - Do: React app with router layout. `client.ts` exposes `getHealth` and `getCluster`; non-2xx responses with an error body become a typed `ApiError`; a network failure becomes `GatewayUnreachableError`. Pin exact versions from SPEC.md. Scripts: `dev`, `build`, `test`, `typecheck`.
  - Done when: `npm run typecheck` and `npm test -- client` pass cases *200 parsed*, *503 → ApiError with code `cluster_unreachable`*, *network error → GatewayUnreachableError*; `npm run build` succeeds.
- [ ] **T1.7 Status bar and gateway-unreachable page** — Covers: F1-AC1, F1-AC2, F1-AC4
  - Files: src/components/StatusBar.tsx (new), src/components/StatusBar.test.tsx (new), src/App.tsx (edit), src/App.test.tsx (new)
  - Do: poll `/api/health` every 5 s and show gateway and cluster state separately, with the error when the cluster is unreachable. If the gateway is unreachable, replace the page with a "Gateway unreachable" message and a Retry button.
  - Done when: `npm test -- StatusBar App` passes cases *up and reachable*, *cluster unreachable shows the error*, *network error → "Gateway unreachable"*, *Retry calls health again and recovers*.
- [ ] **T1.8 Cluster page** — Covers: F1-AC3, F1-AC2 (page message)
  - Files: src/pages/ClusterPage.tsx (new), src/pages/ClusterPage.test.tsx (new), src/App.tsx (edit; route `/cluster`)
  - Do: show cluster id and a broker table (id, host, port, rack), with the controller marked. A 503 shows "Cluster unreachable".
  - Done when: `npm test -- ClusterPage` passes cases *3 brokers, controller marked*, *503 → "Cluster unreachable"*.
- [ ] **T1.9 UI CI** — Covers: Testing
  - Files: .github/workflows/ci.yml (new)
  - Do: set up Node from `.nvmrc`, then run `npm ci`, `npm run typecheck`, `npm test`, `npm run build`.
  - Done when: the workflow passes on GitHub (`gh run list --limit 1` shows `completed success`).

### Slice 2: A developer browses topics and their partitions and config (F2, F3)
**Demo**
1. Run `go run ./cmd/kafka3o-seed -brokers $BROKERS`. Expect `created orders (3 partitions), users (1 partition), produced 10 messages`.
2. Open **Topics**. Expect `orders` (3 partitions, ≈10) and `users` (1, ≈0), sorted by name, with no `__consumer_offsets`.
3. Type `ORD`. Expect only `orders`. Turn on **Show internal**. Expect `__consumer_offsets` to appear.
4. Click `orders`. Expect 3 partition rows with leader, replicas, in-sync replicas, and offsets, and `retention.ms` marked **overridden**.
5. Go to `/topics/missing`. Expect "Topic not found".

**Tasks**
- [ ] **T2.1 Topics endpoints** — Covers: F2-AC1, F2-AC3, F3-AC1, F3-AC2, F3-AC3, F3-AC4
  - Files: internal/api/cluster.go (edit), internal/api/topics.go (new), internal/api/topics_test.go (new), internal/api/fake_test.go (edit), internal/api/server.go (edit)
  - Do: `GET /api/topics` returns name, partition count, `approxMessages` (sum of end − start), and `internal` (name starts with `_`). `GET /api/topics/{name}` returns partitions with `underReplicated` (in-sync replicas < replicas) and configs with `isDefault`. Sensitive config values are left out. A missing topic returns 404 `topic_not_found`.
  - Done when: `go test ./internal/api -run 'TestTopics|TestTopicDetail'` passes cases *counts summed*, *`_` prefix → internal*, *under-replicated flagged*, *override vs. default*, *sensitive value omitted*, *missing → 404*.
- [ ] **T2.2 Kafka adapter: list and describe topics** — Covers: F2-AC1, F3-AC1, F3-AC2
  - Files: internal/kafka/topics.go (new), internal/kafka/topics_integration_test.go (new)
  - Do: implement `ListTopics` and `DescribeTopic` with kadm (metadata, start and end offsets, describe configs). Map Kafka's unknown-topic error to the API's not-found error.
  - Done when: `go vet -tags=integration ./...` passes locally. In CI, `go test -tags=integration ./internal/kafka -run 'TestListTopics|TestDescribeTopic'` passes (*`orders` 3 partitions ≈10*, *`retention.ms` overridden*, *unknown topic → not found*).
- [ ] **T2.3 Dev seed tool** — Covers: demo support for F2 and F3
  - Files: cmd/kafka3o-seed/main.go (new), internal/kafka/seed.go (new), internal/kafka/seed_integration_test.go (new)
  - Do: `-brokers` is required (no environment fallback, to avoid seeding the wrong cluster by accident). Create `orders` (3 partitions, `retention.ms=86400000`) and `users` (1 partition) if they're missing, and produce 10 messages to `orders`. Running it again does nothing.
  - Done when: `go build ./cmd/kafka3o-seed` succeeds. In CI, `TestSeed` passes (*topics created as specified*, *second run adds nothing*).
- [ ] **T2.4 Topics page** — Covers: F2-AC1, F2-AC2, F2-AC3, F2-AC4
  - Files: src/api/client.ts (edit), src/api/types.ts (edit), src/pages/TopicsPage.tsx (new), src/pages/TopicsPage.test.tsx (new), src/App.tsx (edit; routes `/` and `/topics`)
  - Do: a table sorted by name showing "≈" counts. The filter box is case-insensitive substring matching. Internal topics are hidden until **Show internal** is on. No topics shows "No topics yet". A 503 shows "Cluster unreachable".
  - Done when: `npm test -- TopicsPage` passes cases *two topics with counts*, *`ORD` filter*, *internal hidden then shown*, *empty state*.
- [ ] **T2.5 Topic page (partitions and config)** — Covers: F3-AC1, F3-AC2, F3-AC3, F3-AC4
  - Files: src/pages/TopicPage.tsx (new), src/pages/TopicPage.test.tsx (new), src/api/client.ts (edit), src/App.tsx (edit; route `/topics/:name`)
  - Do: a partitions table that highlights under-replicated rows, and a config table marking each value overridden or default; sensitive values show "(hidden)". A 404 shows "Topic not found". Leave a tab placeholder for Messages.
  - Done when: `npm test -- TopicPage` passes cases *3 partition rows*, *override marked*, *under-replicated row flagged*, *404 → "Topic not found"*.

### Slice 3: A developer reads the latest messages of a topic (F4)
**Demo**
1. Run `go run ./cmd/kafka3o-seed -brokers $BROKERS -messages`. Expect `produced 120 messages to orders (JSON, text, binary, 100 KB, with headers)` and an empty topic `empty`.
2. Open `orders` → **Messages**. Expect 50 rows, newest first, each with partition, offset, timestamp, key, value preview, and header count.
3. Expand a JSON message. Expect formatted JSON and the header `trace-id=abc`. Switch to base64, then back.
4. Expand the binary message (expect base64) and the 100 KB message (expect a **truncated** marker).
5. Set the limit to 500. Expect every message, up to 500.
6. Open `empty` → **Messages**. Expect "No messages".
7. Run `go run ./cmd/kafka3o-seed -brokers $BROKERS -list-groups`. Expect no group created by the gateway.

**Tasks**
- [ ] **T3.1 Format detection and truncation** — Covers: F4-AC3, F4-AC5
  - Files: internal/msgfmt/msgfmt.go (new), internal/msgfmt/msgfmt_test.go (new)
  - Do: `Encode(b []byte)` returns `{encoding, data, size, truncated}`. Bytes are cut at 64 KB first. Valid JSON (an object or array) → `json`; otherwise valid UTF-8 → `text`; otherwise `base64`. A nil value → `null`.
  - Done when: `go test ./internal/msgfmt` passes cases *`{"id":1}` → json*, *`hello` → text*, *`0xff 0xfe` → base64*, *100 KB → 64 KB + truncated, size 102400*, *nil → null*, *multi-byte UTF-8 not split mid-character*.
- [ ] **T3.2 Messages endpoint** — Covers: F4-AC1, F4-AC2, F4-AC4, F4-AC7
  - Files: internal/api/cluster.go (edit), internal/api/messages.go (new), internal/api/messages_test.go (new), internal/api/fake_test.go (edit), internal/api/server.go (edit)
  - Do: `limit` defaults to 50 and is capped at 500. A non-numeric or ≤ 0 limit returns 400 `invalid_request`. Call `ReadLatest(topic, limit)`, merge, sort by timestamp descending (ties broken by partition, then offset), keep `limit`, and encode keys, values, and headers with `msgfmt`. A missing topic returns 404.
  - Done when: `go test ./internal/api -run TestMessages` passes cases *default 50*, *1000 requested → `limitApplied` 500*, *`abc` → 400*, *newest first across partitions*, *headers encoded*, *empty → `[]`*, *missing → 404*.
- [ ] **T3.3 Kafka adapter: read latest without a consumer group** — Covers: F4-AC1, F4-AC2, F4-AC6
  - Files: internal/kafka/messages.go (new), internal/kafka/messages_integration_test.go (new)
  - Do: get start and end offsets. For each non-empty partition, consume directly from `max(start, end − limit)` with no group and no commits. Stop at the end offset, or after the 5 s scan limit, returning what was read so far.
  - Done when: `go vet -tags=integration ./...` passes locally. In CI, `go test -tags=integration ./internal/kafka -run TestReadLatest` passes (*120 messages → newest 50*, *1000 → 500*, *headers kept*, *empty topic → none*, *`ListGroups` empty afterwards*).
- [ ] **T3.4 Seed messages** — Covers: demo support for F4
  - Files: cmd/kafka3o-seed/main.go (edit), internal/kafka/seed.go (edit), internal/kafka/seed_integration_test.go (edit)
  - Do: `-messages` produces 120 varied messages to `orders` (JSON, text, binary, one 100 KB value, `trace-id=abc` headers) and creates the empty topic `empty`. `-list-groups` prints the cluster's consumer groups.
  - Done when: in CI, `TestSeedMessages` passes (*120 produced*, *`empty` exists with end offset 0*).
- [ ] **T3.5 Format switching in the UI** — Covers: F4-AC3
  - Files: src/format/format.ts (new), src/format/format.test.ts (new)
  - Do: convert loaded data between json, text, and base64 (pretty-print JSON; text ↔ base64 via `TextEncoder`/`TextDecoder`). Base64 that isn't valid UTF-8 can't switch to text; that option is disabled.
  - Done when: `npm test -- format` passes cases *json → pretty*, *text ↔ base64 round-trip*, *invalid UTF-8 → text option disabled*.
- [ ] **T3.6 Messages tab** — Covers: F4-AC1, F4-AC2, F4-AC3, F4-AC4, F4-AC5, F4-AC7
  - Files: src/pages/MessagesTab.tsx (new), src/pages/MessagesTab.test.tsx (new), src/pages/TopicPage.tsx (edit), src/api/client.ts (edit), src/api/types.ts (edit)
  - Do: a list showing partition, offset, timestamp, key, value preview, and header count. Rows expand to show the full key, value, and headers with a format switch. Limit selector: 50, 100, 200, or 500. Show a "truncated" marker and "No messages" for an empty topic.
  - Done when: `npm test -- MessagesTab` passes cases *50 rows in order*, *limit 500 requests 500*, *expand shows header `trace-id=abc`*, *JSON formatted*, *truncated marker*, *empty state*.
## Review
