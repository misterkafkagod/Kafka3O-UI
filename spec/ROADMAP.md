# Roadmap

## Vision
Kafka3O is a multi-cluster Kafka console for developers and operators: one web UI (Kafka3O-UI) shows every cluster side by side — health, topics, messages, consumer lag. Each cluster is fronted by its own small, stateless gateway (Kafka3O-Gateway) that owns the broker connection and credentials close to that cluster; the browser never talks to Kafka directly.

## Out of Scope
- A gateway serving more than one cluster
- The UI connecting to Kafka directly
- Cluster administration beyond the listed write features: ACLs, quotas, partition reassignment, broker config changes
- Kafka Connect, ksqlDB, or Schema Registry administration
- Replaying, copying, or transforming messages between topics
- Persistence in the gateway (no database; stateless)

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

## Milestones
### M1 — See all my clusters and what topics they hold, from one screen
- **Status:** Active
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
  - **P13** F1-B7 · Gateway connects to TLS/SASL-secured clusters — Covers: F1-AC7 · Discovery: kafka-tls-scram-dev · Status: Defined
    - Demo: a gateway pointed at a TLS + SCRAM-SHA-512 cluster shows its card as Healthy.
    - Blocked: secured-broker discovery has not been run, and no isolated Kafka test environment is available.

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
- **Status:** Active
- **Features:** F7, F8, F9
- **Phases:**
  - **P19** F7-B1 + F7-B2 · Bounded topic message search — Covers: F7-AC1, F7-AC2, F7-AC3 · Discovery: — · Status: Building
    - Demo: search a topic with records across partitions and see matches, examined count, the 500-position limit, and whether any positions were excluded.
  - **P20** F8-B1 + F8-B2 · Search topic names across gateways — Covers: F8-AC1, F8-AC2 · Discovery: — · Status: Planned
    - Demo: find `orders` across two clusters, then stop one gateway and verify the other result remains visible.
  - **P21** F9-B1 + F9-B2 · Copy and open a message link — Covers: F9-AC1, F9-AC2 · Discovery: — · Status: Planned
    - Demo: copy a message link, open it in a new tab, and verify only its exact partition and offset are shown.

### M4 — See whether consumers are keeping up
- **Status:** Planned
- **Features:** F10, F11

### M5 — Safe write access for debugging
- **Status:** Planned
- **Features:** F12, F13, F14

## Backlog
- **F15** User can reset a consumer group's offsets to earliest, latest or a timestamp
- **F16** User can decode Avro/Protobuf values via a Schema Registry
- **F17** User can add or remove gateways from the UI instead of a config file
- **Technical debt:** Upgrade the Gateway Go toolchain and build image to a release fixing GO-2026-6809; the 2026-11-04 scan reports CISA CVSS 6.8 medium in Go 1.27.2.

## Learnings
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
