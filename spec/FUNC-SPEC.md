# Functional Spec

### F1 — Cluster overview
Every configured gateway is shown as a cluster card with live health.

**Behaviors**
- **F1-B1** User opens the UI → system loads the gateway list from `/config.json` and shows one card per gateway (name, URL)
- **F1-B2** For each gateway, system calls `GET /api/v1/cluster` → card shows **Healthy**, the Kafka cluster ID and the broker count
- **F1-B3** Gateway does not answer within 5 s or the network fails → that card shows **Gateway unreachable**; other cards are unaffected
- **F1-B4** Gateway answers but cannot reach Kafka → card shows **Cluster unreachable** with the gateway's error message
- **F1-B5** Page stays open → each card's status refreshes every 15 s without a reload
- **F1-B6** `/config.json` is missing, invalid or lists no gateways → page shows **No gateways configured** with a hint on the expected format
- **F1-B7** Gateway is configured for a secured cluster (TLS and/or SASL PLAIN, SCRAM-SHA-256/512) → it connects and the card shows **Healthy**

**Acceptance criteria**
- **F1-AC1** (B1) Given a config with gateways "dev" and "prod", when the UI opens → two cards labelled "dev" and "prod" are shown
- **F1-AC2** (B2) Given a gateway whose cluster has 3 brokers, when its card loads → it shows "Healthy", the cluster ID and "3 brokers"
- **F1-AC3** (B3) Given "dev" healthy and "prod" timing out, when the page loads → "dev" shows Healthy and "prod" shows "Gateway unreachable"
- **F1-AC4** (B4) Given a gateway returning 503 with code `cluster_unreachable`, when its card loads → it shows "Cluster unreachable" and the message
- **F1-AC5** (B5) Given a Healthy card, when its gateway starts failing and 15 s pass → the card changes to "Gateway unreachable" without a reload
- **F1-AC6** (B6) Given `/config.json` returns 404 or `{"gateways":[]}`, when the UI opens → "No gateways configured" is shown
- **F1-AC8** (B4) Given a card showing Healthy, when that cluster's Kafka stops while its gateway keeps running → within 15 s the card shows "Cluster unreachable"
- **F1-AC7** (B7) Given a gateway configured with TLS and SASL SCRAM-SHA-512 credentials for a cluster that requires them, when its card loads → it shows "Healthy"

**External dependencies:** Gateway HTTP API (UI tests fake it with MSW); Kafka cluster behind each gateway (gateway unit tests fake it behind interfaces; integration tests use testcontainers `apache/kafka:4.3.1`)

### F2 — Cluster brokers
A cluster page shows the cluster's identity and brokers.

**Behaviors**
- **F2-B1** User clicks a cluster card → cluster page shows cluster ID, controller ID, and a broker table (ID, host:port, rack) sorted by ID
- **F2-B2** Gateway or cluster unreachable on the cluster page → error message with a **Retry** button
- **F2-B3** URL names a gateway ID not in the config → **Cluster not found** with a link back to the overview

**Acceptance criteria**
- **F2-AC1** (B1) Given a cluster with brokers 1, 2, 3 and controller 2, when the user opens it → 3 rows in ID order and controller "2" are shown
- **F2-AC2** (B2) Given the gateway is down, when the cluster page loads → an error and Retry are shown; when the gateway is back and Retry is clicked → brokers are shown
- **F2-AC3** (B3) Given the URL `/clusters/unknown`, when the page loads → "Cluster not found" with a link to `/` is shown

**External dependencies:** same as F1

### F3 — Topic list
A cluster's topics with their size, filterable by name.

**Behaviors**
- **F3-B1** User opens a cluster's **Topics** tab → system lists topics with name, partitions, replication factor and approximate message count (sum of end − start offsets), sorted by name
- **F3-B2** Internal topics are hidden by default → toggling **Show internal** lists them too
- **F3-B3** User types in the filter box → list shows only topics whose name contains the text, case-insensitive; when topics exist but none match → `No topics match "<text>"`
- **F3-B4** Cluster has no non-internal topics → **No topics** is shown
- **F3-B5** Gateway or cluster fails → error message with a Retry button

**Acceptance criteria**
- **F3-AC1** (B1) Given topics `orders` (6 partitions, RF 3, 1000 messages) and `audit`, when the tab opens → `audit` is listed first, then `orders` showing 6, 3 and ~1000
- **F3-AC2** (B2) Given `__consumer_offsets` exists, when the tab opens → it is hidden; when "Show internal" is toggled on → it is listed
- **F3-AC3** (B3) Given topics `orders` and `audit`, when the user types "ORD" → only `orders` is shown
- **F3-AC4** (B4) Given a cluster with only internal topics, when the tab opens → "No topics" is shown
- **F3-AC5** (B5) Given the gateway returns 503, when the tab opens → an error and Retry are shown

**External dependencies:** same as F1

### F4 — Topic detail
Partitions (leader, replicas, ISR, offsets) and config of one topic · *detailed when M2 starts*

### F5 — Read latest messages
Latest messages of a topic with key, value, headers, timestamp; value as text, JSON or base64 · *detailed when M2 starts*

### F6 — Read from a position
Start reading from a chosen partition, offset or timestamp · *detailed when M2 starts*

### F7 — Search messages
Bounded scan for messages whose key or value contains some text · *detailed when M3 starts*

### F8 — Cross-cluster topic search
Find a topic by name across all configured clusters · *detailed when M3 starts*

### F9 — Message deep link
Copyable link that opens directly to one message · *detailed when M3 starts*

### F10 — Consumer groups
Consumer groups with state, members and per-partition lag · *detailed when M4 starts*

### F11 — Topic consumers
Which consumer groups read a topic and how far behind they are · *detailed when M4 starts*

### F12 — Gateway authentication
Gateways accept only authenticated requests · *detailed when M5 starts*

### F13 — Produce message
Produce a test message (key, value, headers) to a topic · *detailed when M5 starts*

### F14 — Create or delete topic
Create or delete a topic · *detailed when M5 starts*
