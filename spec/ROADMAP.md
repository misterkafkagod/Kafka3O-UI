# Roadmap

## Vision
Kafka3O is a multi-cluster Kafka console for developers and operators: one web UI (Kafka3O-UI) shows every cluster side by side — health, topics, messages, consumer lag. Each cluster is fronted by its own small, stateless gateway (Kafka3O-Gateway) that owns the broker connection and credentials close to that cluster; the browser never talks to Kafka directly.

The console should be comfortable for dense technical data, easy to navigate, and explicit about connection problems and write outcomes. M6–M8 turn the existing functional pages into a consistent, accessible operator interface without changing the gateway API or the completed M1–M5 behavior.

## Out of Scope
- A gateway serving more than one cluster
- The UI connecting to Kafka directly
- Cluster administration beyond the listed write features: ACLs, quotas, partition reassignment, broker config changes
- Kafka Connect, ksqlDB, or Schema Registry administration
- Replaying, copying, or transforming messages between topics
- Persistence in the gateway (no database; stateless)
- UI redesign introducing new Kafka capabilities, live streaming, invented metrics, roles, or a backend/API redesign

## Features
- **F1** User can see every configured cluster on one page with its health (gateway reachable, cluster reachable, broker count)
- **F2** User can open a cluster and see its brokers and controller
- **F3** User can list a cluster's topics with partition count, replication factor and approximate message count, and filter them
- **F4** User can open a topic and see its partitions (leader, replicas, ISR, start/end offsets) and its config
- **F5** User can read a topic's latest messages (key, value, headers, timestamp; value as text, JSON or base64)
- **F6** User can start reading from a chosen partition, offset or timestamp
- **F7** User can search a topic for messages whose key or value contains some text, within a bounded scan
- **F8** User can find a topic by name across all clusters at once
- **F9** User can copy a link that opens directly to one message
- **F10** User can see consumer groups with state, members and lag per partition
- **F11** User can see which consumer groups read a given topic and how far behind they are
- **F12** User can only reach a gateway when authenticated
- **F13** User can produce a test message (key, value, headers) to a topic
- **F14** User can create or delete a topic
- **F18** User can navigate every page through a consistent application shell, active cluster, breadcrumbs and contextual tabs
- **F19** User can read and operate every existing page with consistent styling, accessible controls, responsive layouts and clear states
- **F20** User can manage per-gateway connections in a dedicated panel instead of permanent header forms
- **F21** User can explore clusters, brokers, topics and configuration through organized overview and detail pages
- **F22** User can read and search messages in a compact list with a selected-record inspector for payload, headers and exact position
- **F23** User can inspect consumer groups and partition lag through summary-to-detail navigation
- **F24** User can produce messages and create or delete topics through contextual forms with explicit pending, confirmed and uncertain outcomes

## Milestones
### M1 — See all my clusters and what topics they hold, from one screen
- **Status:** Done
- **Features:** F1, F2, F3
- **Phases:**
  - **P01** F1-B1 + F1-B6 · Cluster cards from config, and the "no gateways" case — Covers: F1-AC1, F1-AC6 · Discovery: — · Status: Done
    - Demo: `npm run dev` with `config.json` listing "dev" and "prod" shows two cards; emptying the list shows "No gateways configured".
  - **P02** F1-B2 · Healthy cluster shows its ID and broker count — Covers: F1-AC2 · Discovery: — · Status: Done
    - Demo: `docker compose -f deploy/compose.dev.yaml up` + `npm run dev` shows both cards Healthy with cluster ID and "1 broker".
  - **P03** F1-B3 · Unreachable gateway is isolated to its card — Covers: F1-AC3 · Discovery: — · Status: Done
    - Demo: stopping `gateway-prod` and reloading shows "prod" as "Gateway unreachable" while "dev" stays Healthy.
  - **P04** F1-B4 · Gateway up but Kafka down — Covers: F1-AC4 · Discovery: — · Status: Done
    - Demo: stopping `kafka-prod` and reloading shows "prod" as "Cluster unreachable" with the gateway's message.
  - **P05** F1-B5 · Status refreshes every 15 s — Covers: F1-AC5 · Discovery: — · Status: Done
    - Demo: with the page open, stopping `gateway-prod` turns its card "Gateway unreachable" within 15 s without a reload.
  - **P06** F2-B1 · Cluster page with brokers and controller — Covers: F2-AC1 · Discovery: — · Status: Done
    - Demo: clicking the "dev" card shows cluster ID, controller ID and the broker table.
  - **P07** F2-B2 · Cluster page error with Retry — Covers: F2-AC2 · Discovery: — · Status: Done
    - Demo: with `gateway-dev` stopped, `/clusters/dev` shows an error and Retry; starting it and clicking Retry shows the brokers.
  - **P08** F2-B3 · Unknown cluster ID — Covers: F2-AC3 · Discovery: — · Status: Done
    - Demo: `/clusters/unknown` shows "Cluster not found" with a link back to `/`.
  - **P09** F3-B1 · Topic list with partitions, RF, approximate count — Covers: F3-AC1 · Discovery: — · Status: Done
    - Demo: after creating `orders` and `audit` and producing messages, the Topics tab lists them sorted by name with counts.
  - **P10** F3-B2 + F3-B4 · Internal topics hidden; "No topics" — Covers: F3-AC2, F3-AC4 · Discovery: — · Status: Done
    - Demo: a fresh cluster shows "No topics"; toggling "Show internal" lists `__consumer_offsets`.
  - **P11** F3-B3 · Filter topics by name — Covers: F3-AC3 · Discovery: — · Status: Done
    - Demo: typing "ORD" leaves only `orders`.
  - **P12** F3-B5 · Topic list error with Retry — Covers: F3-AC5 · Discovery: — · Status: Done
    - Demo: with `kafka-dev` stopped, the Topics tab shows an error and Retry.
  - **P14** F1-B4 (correction) · Status reflects a cluster that goes down after a healthy check — Covers: F1-AC8 · Discovery: — · Status: Done
    - Demo: with both cards Healthy, `docker compose stop kafka-prod` (gateway keeps running) → within 15 s "Prod" shows "Cluster unreachable".
    - Scope: the cluster adapter (and the topic metadata adapter from P09) send a direct `kmsg.MetadataRequest` via `kgo.Client.Request` instead of kadm's cached `BrokerMetadata` / `ListTopicsWithInternal`; integration test stops Kafka after a successful call.
  - **P13** F1-B7 · Gateway connects to TLS/SASL-secured clusters — Covers: F1-AC7 · Discovery: kafka-tls-scram-dev · Status: Done
    - Demo: a gateway pointed at a TLS + SCRAM-SHA-512 cluster shows its card as Healthy.

### M2 — Look inside a topic and read its messages
- **Status:** Done
- **Features:** F4, F5, F6
- **Phases:**
  - **P15** F4-B1 + F4-B2 · Topic partitions and configuration — Covers: F4-AC1, F4-AC2 · Discovery: — · Status: Done
    - Demo: open `orders` from the Topics tab and inspect its ordered partition metadata and configuration; stop Kafka and verify the unavailable state offers Retry.
  - **P16** F5-B1 · Read latest messages — Covers: F5-AC1 · Discovery: — · Status: Done
    - Demo: produce records to multiple partitions, open Messages, and verify at most 50 records appear newest first with their metadata and headers.
  - **P17** F5-B2 · Choose message value representation — Covers: F5-AC2 · Discovery: — · Status: Done
    - Demo: switch a JSON message between text, formatted JSON, and base64; switch to an invalid JSON message and verify it remains inspectable.
  - **P18** F6-B1 + F6-B2 · Read from a partition position — Covers: F6-AC1, F6-AC2, F6-AC3 · Discovery: — · Status: Done
    - Demo: read `orders` from a chosen partition by offset and timestamp, then submit an invalid position and verify the validation error.

### M3 — Find what I'm looking for, even across clusters
- **Status:** Done
- **Features:** F7, F8, F9
- **Phases:**
  - **P19** F7-B1 + F7-B2 · Bounded topic message search — Covers: F7-AC1, F7-AC2, F7-AC3 · Discovery: — · Status: Done
    - Demo: search a topic with records across partitions and see matches, examined count, the 500-position limit, and whether any positions were excluded.
  - **P20** F8-B1 + F8-B2 · Search topic names across gateways — Covers: F8-AC1, F8-AC2 · Discovery: — · Status: Done
    - Demo: find `orders` across two clusters, then stop one gateway and verify the other result remains visible.
  - **P21** F9-B1 + F9-B2 · Copy and open a message link — Covers: F9-AC1, F9-AC2 · Discovery: — · Status: Done
    - Demo: copy a message link, open it in a new tab, and verify only its exact partition and offset are shown.

### M4 — See whether consumers are keeping up
- **Status:** Done
- **Features:** F10, F11
- **Phases:**
  - **P22** F10-B1 + F10-B2 + F10-B3 · Consumer groups and partition lag — Covers: F10-AC1, F10-AC2, F10-AC3 · Discovery: — · Status: Done
    - Demo: open Consumer groups after producing and consuming records, inspect members and per-partition lag, and verify missing commits are not shown as zero.
  - **P23** F11-B1 + F11-B2 · Topic consumer groups — Covers: F11-AC1, F11-AC2 · Discovery: — · Status: Done
    - Demo: open a topic's Consumers tab and see only groups and lag rows associated with that topic.

### M5 — Safe write access for debugging
- **Status:** Done
- **Verification:** Automated suites, real-Kafka integration tests, and an authenticated browser smoke test pass. The browser test used a certificate-error override; trusted-certificate deployment and the full key/header browser demo remain to be verified.
- **Features:** F12, F13, F14
- **Phases:**
  - **P24** F12-B1 + F12-B2 + F12-B3 · Authenticate gateway requests over TLS — Covers: F12-AC1, F12-AC2, F12-AC3 · Discovery: — · Status: Done
    - Demo: start a gateway with a certificate and token, verify anonymous liveness and rejected unauthenticated API calls, then enter the token and load the cluster.
  - **P25** F13-B1 + F13-B2 · Produce a test message — Covers: F13-AC1, F13-AC2 · Discovery: — · Status: Done
    - Demo: produce a message with key and headers and read it back by its returned partition and offset.
  - **P26** F14-B1 + F14-B3 · Create a topic — Covers: F14-AC1, F14-AC3 · Discovery: — · Status: Done
    - Demo: create a topic with explicit partition and replication counts and see it in the topic list.
  - **P27** F14-B2 · Delete a topic — Covers: F14-AC2 · Discovery: — · Status: Done
    - Demo: cancel deletion, then confirm it and observe the accepted deletion request.

### M6 — A consistent, accessible console foundation
- **Status:** Done
- **Features:** F18, F19, F20
- **Goal:** Replace the browser-default presentation and permanent credential forms with a coherent shell, shared visual baseline and accessible connection panel across the existing pages.
- **Phases:**
  - **P28** F18-B1 · Navigate with consistent shell and page context — Covers: F18-AC1 · Discovery: — · Status: Done
    - Demo: visit the overview, cluster sections and topic views; verify the active navigation and breadcrumb destinations match each page.
  - **P29** F18-B2 · Restore direct routes and browser history — Covers: F18-AC2 · Discovery: — · Status: Done
    - Demo: open an encoded-topic exact-message URL directly, then use Back and Forward and verify the topic and exact message position.
  - **P30** F19-B1 · Apply a shared visual language and system theme — Covers: F19-AC1 · Discovery: — · Status: Done
    - Demo: check representative pages in light and dark themes; verify contrast, accessible control names and text-based statuses.
  - **P31** F19-B2 · Keep pages usable across viewports and input modes — Covers: F19-AC2 · Discovery: — · Status: Done
    - Demo: check 320, 768 and 1440 CSS-pixel widths and 200% zoom; navigate by keyboard and verify skip navigation, focus, contained table overflow and reduced motion.
  - **P32** F19-B3 · Show truthful loading, empty, error and partial-result states — Covers: F19-AC3 · Discovery: — · Status: Done
    - Demo: with two gateway fixtures, exercise loading, empty, no-match and failure states plus one healthy and one failed gateway; verify no false zero or healthy status.
  - **P33** F20-B1 + F20-B2 · Manage gateway credentials in an accessible connection panel — Covers: F20-AC1, F20-AC2 · Discovery: — · Status: Done
    - Demo: open the panel from the shell and an authentication prompt; add or remove one of two tokens and verify focus behavior, session isolation and cache refresh.
  - **P34** F20-B3 · Recover safely from credential and transport errors — Covers: F20-AC3 · Discovery: — · Status: Done
    - Demo: submit invalid credentials, recover from 401, then simulate a network/TLS failure; verify no token exposure or certificate bypass and keep the other gateway usable.

### M7 — Efficient investigation of clusters, topics and messages
- **Status:** Done
- **Features:** F21, F22
- **Goal:** Organize the read workflows into dense, readable overview/detail pages and a message workspace with a compact result list and selected-record inspector.
- **Phases:**
  - **P35** F21-B1 · Review clusters and cross-cluster topic results — Covers: F21-AC1 · Discovery: — · Status: Done
    - Demo: open the overview with two gateways, search topics and verify one failure does not hide the other gateway's result.
  - **P36** F21-B2 · Inspect cluster and broker context — Covers: F21-AC2 · Discovery: — · Status: Done
    - Demo: open a healthy cluster and a failed cluster; compare the factual summary, broker table and recoverable error.
  - **P37** F21-B3 · Browse topics, partitions and configuration — Covers: F21-AC3 · Discovery: — · Status: Done
    - Demo: filter topics, open an encoded topic name and inspect its partitions and hidden sensitive configuration.
  - **P38** F22-B1 · Select and inspect message read results — Covers: F22-AC1 · Discovery: — · Status: Done
    - Demo: read several records, select each by keyboard and inspect its position, payload formats and headers.
  - **P39** F22-B2 · Inspect bounded message search results — Covers: F22-AC2 · Discovery: — · Status: Done
    - Demo: search messages, select a match and verify the scanned count, truncation notice and retry behavior.
  - **P40** F22-B3 · Inspect and share exact message links — Covers: F22-AC3 · Discovery: — · Status: Done
    - Demo: copy an exact message link and reopen it, then check an unavailable or unverifiable position.

### M8 — Clear operational workflows
- **Status:** Active
- **Features:** F23, F24
- **Goal:** Make consumer lag investigation and existing write operations understandable, contextual and explicit about safety and uncertain outcomes.
- **Phases:**
  - **P41** F23-B1 · Navigate cluster consumer-group summaries and details — Covers: F23-AC1 · Discovery: — · Status: Done
    - Demo: navigate from group summaries to exact partition-lag details and retry an incomplete group.
  - **P42** F23-B2 · Investigate topic-specific consumer groups — Covers: F23-AC2 · Discovery: — · Status: Done
    - Demo: inspect a topic's associated group and distinguish an unresolved association.
  - **P43** F24-B1 · Create topics with contextual feedback — Covers: F24-AC1 · Discovery: — · Status: Done
    - Demo: validate topic settings and inspect accepted and uncertain outcomes without repeating a pending request.
  - **P44** F24-B2 · Produce messages with contextual feedback — Covers: F24-AC2 · Discovery: — · Status: Review
    - Demo: submit a synthetic message with an optional key and header, then inspect its exact acknowledged position or an uncertain outcome.
  - **P45** F24-B3 · Request topic deletion with explicit consequences — Covers: F24-AC3 · Discovery: — · Status: Planned
    - Demo: cancel a deletion, then confirm a synthetic request and distinguish acceptance from completed removal.

M6–M8 preserve existing routes, gateway contracts, exact offsets, bounded reads/searches and write safeguards. Each milestone must be served and verified at the EKS-D manual-test URL before it is marked Done; broker data and existing access endpoints must be preserved.

## Backlog
- **F15** User can reset a consumer group's offsets to earliest, latest or a timestamp
- **F16** User can decode Avro/Protobuf values via a Schema Registry
- **F17** User can add or remove gateways from the UI instead of a config file
- **Verification debt:** Run the Docker-only stopped-broker test and P14 browser demo, and verify the remaining cross-cluster and consumer-group browser demos.
- **Verification debt:** Repeat the P24–P27 browser smoke test with a trusted deployment certificate and complete the producer key/header browser demo.
- **Verification debt:** Run the built gateway container in a deployment; the image was built and scanned on EKS-D but was not started as a container.

## Learnings
- 2026-11-06 (M7 retro): P35–P40 cover F21–F22 while preserving independent Gateway failures, bounded searches and exact message positions.
- 2026-11-06 (M7 retro): A shared selectable inspector avoids repeated payload expansion and keeps selection local to the current result set.
- 2026-11-06 (M7 retro): Browser fixtures exercised large offsets, unavailable records and recovery; the persistent clusters had no sampled records for a real exact-position demo, so that check remains unrun.
- 2026-11-06 (M7 retro): The EKS-D UI rollout preserved Kafka data and the prior ConfigMap, but rotated the test certificates and tokens and required restoring the tunnel.
- 2026-11-06 (M7 retro): Both npm audits had zero findings; Node itself remains pending a runtime vulnerability scan.
- 2026-11-06 (P35): A configured-gateway count is factual even while individual gateways load or fail; gateway IDs need URL encoding in overview links as well as breadcrumbs.
- 2026-11-06 (M6 retro): P28–P34 cover all F18–F20 acceptance criteria; shared navigation, accessible states and contextual recovery preserve existing routes and write safeguards.
- 2026-11-06 (M6 retro): Browser fixtures made focus, failure and gateway-isolation behavior reproducible, while the EKS-D checks confirmed the actual static assets and secured Kafka connections.
- 2026-11-06 (M6 retro): Replacing the manual pod rotates its test credentials and certificates; preserve the prior ConfigMap, restore the tunnel and tell testers to trust the new certificates and copy fresh tokens.
- 2026-11-06 (M6 retro): Verify milestone tests and builds on the declared Node 24 runtime rather than relying on the workstation's older default Node version. The Node runtime vulnerability scan remains pending.
- 2026-11-06 (P33): A native modal needs verified Escape and focus restoration in the embedded browser; gateway-specific recovery must be available on read and write authentication prompts, without replaying writes.
- 2026-11-06 (P32): Missing or invalid gateway configuration is distinct from a network or server failure retrieving configuration; only the latter needs a recoverable error.
- 2026-11-05 (M6–M8 planning): The live UI and source review showed browser-default styling, no stylesheet files, global inline credentials, payloads expanded inside message rows and inline consumer-group details. Approved an incremental UX redesign: shared console foundation first, investigation pages second, operational workflows third. M1–M5 remain Done; F15–F17 remain in backlog; no new dependencies or gateway capabilities are proposed.
- 2026-11-05 (M1 retro): Real secured Kafka testing uncovered the separate per-read clients; sharing the main client's options keeps message reads authenticated and encrypted.
- 2026-11-05 (M1 retro): The UI card and, separately, the production gateway binary reached a TLS/SCRAM-SHA-512 broker on EKS-D. Browser trust of the gateway certificate remains unverified because the demo used a test-only override.
- 2026-11-05 (M1 retro): Go 1.27.3 fixes the certificate-verification advisory; scans found no called Go vulnerabilities and no npm audit findings. The gateway image was built and had no high/critical Trivy findings; the Docker-only lifecycle test remains unrun.
- 2026-11-05 (EKS-D retest): Fifteen real-Kafka scenarios passed, including a stopped-broker case adapted to delete its disposable pod. The original Docker-only test was not run. UI tests (268) and the build passed in a Node 24.21.0 pod using mocked gateway responses.
- 2026-11-05 (M2–M5 verification): A disposable EKS-D Kafka broker exercised the existing broker tests, empty and mixed partitions, transaction markers, real log compaction, and authenticated write lifecycle. A browser smoke test covered topic creation, empty and mixed reads, produce/read at the returned position, cancelled/confirmed deletion, and credential removal; TLS certificate errors were overridden for this test.
- 2026-11-04 (M5 retro): Mandatory gateway TLS and per-gateway credentials provide a consistent boundary for reads and writes.
- 2026-11-04 (M5 retro): Exact decimal offsets and explicit uncertain outcomes avoid misleading success or failure claims.
- 2026-11-04 (M5 retro): Automated and mocked-browser flows exercise wiring and confirmation, but cannot prove real Kafka behavior.
- 2026-11-04 (M5 retro): Broker-backed demos and integration tests and supported-Node UI validation were outstanding at review time.
- 2026-11-04 (M5 / P27): A confirmed delete is an accepted asynchronous request, not proof of completed removal; cancel sends nothing and stale topic caches are invalidated.
- 2026-11-04 (M5 / P26): Validate Kafka topic-name and numeric bounds before writes; refresh topic-list caches for gateway aliases and report unconfirmed creation honestly.
- 2026-11-04 (M5 / P25): Exact offsets are returned as decimal strings; failed produces are treated as potentially delivered and are not automatically retried. Real-broker verification was outstanding at review time.
- 2026-11-04 (M5 / P24): Gateway authentication requires trusted TLS and a random per-gateway token; credential changes reset gateway caches. A real-broker authentication demo was outstanding at review time.
- 2026-11-04 (M4 retro): Shared group snapshots keep cluster and topic views consistent; explicit unknown association and lag states avoid false empty or zero results; nullable decimal strings preserve Kafka offsets in JSON and OpenAPI. Real-broker verification was outstanding at review time.
- 2026-11-04 (M4 / P22): Consumer group offsets are nullable decimal strings in both JSON and OpenAPI; the broker-backed group test and demo were outstanding at review time.
- 2026-11-04 (M3 retro): Independent gateway queries keep partial search results usable; the topic-wide search bound must describe offset windows rather than global timestamp order; exact decimal offsets prevent incorrect message links. Real-broker verification was outstanding at review time.
- 2026-11-04 (M3 / P19): Search allocates a single 500-offset window fairly across partitions; timestamps do not establish which offsets are globally newest.
- 2026-11-04 (M1 / P14): Live metadata requests replace cached health and topic-list metadata; stopped-broker integration and demo remain unverified without Docker.
- 2026-11-04 (M2 / F6): The UI composition root dropped positioned-read arguments; a regression test now covers the production wiring for offset and timestamp requests.
- 2026-10-24 (M1 / P10): On Kafka 4.3, describing an unknown consumer group fails and creates nothing; to create `__consumer_offsets` without creating a normal topic, run a console consumer with `--include '.*' --group <g>`.
- 2026-10-24 (M1 / P07): A dropped 8081/8082 SSH forward looks exactly like a stopped gateway; demo runs check the forward before stopping containers.
- 2026-10-24 (M1 / P06): Cluster page and card share the cluster-status query key, so the page renders from cache after a card click. Demos can be driven by Claude with Playwright headless Chromium (installed in the session scratchpad) and screenshots shown to the user.
- 2026-10-18 (planning): Restarted with a multi-cluster design — one gateway per cluster, one UI for all. Earlier attempts were single-cluster. Gateway list is a static `/config.json` deployed with the UI. Auth (F12) is deferred to M5, ahead of any write feature; M1–M4 assume gateways run on a trusted network, because holding several gateway credentials in a browser needs its own design.
- 2026-10-18 (M1 / P01): DI rule clarified — pure functions and child components are imported directly; only I/O and side-effecting actions are injected (literal injection everywhere would mean prop-drilling every component).
- 2026-10-18 (M1 / P02 planning): TLS/SASL support was promised in TECH-SPEC but had no phase; added F1-B7 and P13. No local container runtime on the dev Mac — Docker may run on another machine (docker context over SSH).
- 2026-10-22 (M1 / P05): React Query keeps the last data after a failed refetch, so views check the error state before data — otherwise a down gateway stays "Healthy".
- 2026-10-20 (M1 / P04): kadm's metadata helpers serve franz-go's metadata cache, and broker-only requests never refresh it — a gateway that saw a healthy cluster keeps reporting it Healthy after Kafka stops. Kept as is for now (user decision); correction planned as P14. P04's demo restarts the gateway after stopping Kafka.
- 2026-10-20 (M1 / P03): Under jsdom, fetch's `DOMException` comes from another realm than the global one; the UI classifies errors by `name`, not `instanceof`.
- 2026-10-20 (M1 / P02): Inline-helper rule tightened (named transforms/comparators get their own file; only logic-free framework glue inline). govulncheck must include `-test -tags integration`: testcontainers brought 3 fixable findings. Gateway image scanned with Trivy: 0 critical/high.
- 2026-10-19 (M1 / P02): Remote Docker works via an SSH-forwarded Unix socket plus `TESTCONTAINERS_HOST_OVERRIDE`; compose configures gateways via env vars because bind mounts resolve on the remote host. `apache/kafka` falls back to one fixed cluster ID, so each dev cluster sets its own `CLUSTER_ID`.
- 2026-10-18 (M1 / plan-ahead): Gateway Kafka timeout equal to the UI gateway timeout (5 s) would make a down Kafka look like a down gateway; gateway default lowered to 3 s. franz-go `kfake` rejected (no tagged release). P13 needs discovery for a TLS + SCRAM apache/kafka dev setup.
- 2026-10-18 (M1 / P01): MSW 3 renamed `onUnhandledRequest` to `onUnhandledFrame`; check major-version API changes when pinning fresh majors.
