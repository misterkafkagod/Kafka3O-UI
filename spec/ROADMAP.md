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
  - **P01** F1-B1 + F1-B6 · Cluster cards from config, and the "no gateways" case — Covers: F1-AC1, F1-AC6 · Discovery: — · Status: Review
    - Demo: `npm run dev` with `config.json` listing "dev" and "prod" shows two cards; emptying the list shows "No gateways configured".
  - **P02** F1-B2 · Healthy cluster shows its ID and broker count — Covers: F1-AC2 · Discovery: — · Status: Defined
    - Demo: `docker compose -f deploy/compose.dev.yaml up` + `npm run dev` shows both cards Healthy with cluster ID and "1 broker".
  - **P03** F1-B3 · Unreachable gateway is isolated to its card — Covers: F1-AC3 · Discovery: — · Status: Defined
    - Demo: stopping `gateway-prod` and reloading shows "prod" as "Gateway unreachable" while "dev" stays Healthy.
  - **P04** F1-B4 · Gateway up but Kafka down — Covers: F1-AC4 · Discovery: — · Status: Defined
    - Demo: stopping `kafka-prod` and reloading shows "prod" as "Cluster unreachable" with the gateway's message.
  - **P05** F1-B5 · Status refreshes every 15 s — Covers: F1-AC5 · Discovery: — · Status: Defined
    - Demo: with the page open, stopping `gateway-prod` turns its card "Gateway unreachable" within 15 s without a reload.
  - **P06** F2-B1 · Cluster page with brokers and controller — Covers: F2-AC1 · Discovery: — · Status: Defined
    - Demo: clicking the "dev" card shows cluster ID, controller ID and the broker table.
  - **P07** F2-B2 · Cluster page error with Retry — Covers: F2-AC2 · Discovery: — · Status: Defined
    - Demo: with `gateway-dev` stopped, `/clusters/dev` shows an error and Retry; starting it and clicking Retry shows the brokers.
  - **P08** F2-B3 · Unknown cluster ID — Covers: F2-AC3 · Discovery: — · Status: Defined
    - Demo: `/clusters/unknown` shows "Cluster not found" with a link back to `/`.
  - **P09** F3-B1 · Topic list with partitions, RF, approximate count — Covers: F3-AC1 · Discovery: — · Status: Defined
    - Demo: after creating `orders` and `audit` and producing messages, the Topics tab lists them sorted by name with counts.
  - **P10** F3-B2 + F3-B4 · Internal topics hidden; "No topics" — Covers: F3-AC2, F3-AC4 · Discovery: — · Status: Defined
    - Demo: a fresh cluster shows "No topics"; toggling "Show internal" lists `__consumer_offsets`.
  - **P11** F3-B3 · Filter topics by name — Covers: F3-AC3 · Discovery: — · Status: Defined
    - Demo: typing "ORD" leaves only `orders`.
  - **P12** F3-B5 · Topic list error with Retry — Covers: F3-AC5 · Discovery: — · Status: Defined
    - Demo: with `kafka-dev` stopped, the Topics tab shows an error and Retry.

### M2 — Look inside a topic and read its messages
- **Status:** Planned
- **Features:** F4, F5, F6

### M3 — Find what I'm looking for, even across clusters
- **Status:** Planned
- **Features:** F7, F8, F9

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

## Learnings
- 2026-10-18 (planning): Restarted with a multi-cluster design — one gateway per cluster, one UI for all. Earlier attempts were single-cluster. Gateway list is a static `/config.json` deployed with the UI. Auth (F12) is deferred to M5, ahead of any write feature; M1–M4 assume gateways run on a trusted network, because holding several gateway credentials in a browser needs its own design.
