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
Open a topic to inspect its partitions, offsets, and configuration.

**Behaviors**
- **F4-B1** User opens a topic from the topic list → system shows its partitions, leaders, replicas, ISR, start/end offsets, and configuration entries
- **F4-B2** Topic no longer exists or the gateway cannot reach Kafka → system shows a clear not-found or cluster-unavailable state with Retry where retry can help

**Acceptance criteria**
- **F4-AC1** (B1) Given a topic with multiple partitions and configuration entries, when the user opens it → partitions appear in ID order with leader, replicas, ISR, start/end offsets, and the configuration entries; sensitive values are not exposed
- **F4-AC2** (B2) Given the topic was deleted or Kafka is unreachable, when the user opens it → the UI distinguishes not-found from cluster-unreachable and offers Retry for the latter

**External dependencies:** Gateway HTTP API and Kafka metadata/config APIs; UI tests fake the gateway with MSW, gateway unit tests fake Kafka ports, integration tests use the existing testcontainers Kafka setup

### F5 — Read latest messages
Read a bounded batch of a topic's latest messages and view their values as text, JSON, or base64.

**Behaviors**
- **F5-B1** User opens a topic's Messages view → system returns at most 50 latest messages across its partitions, newest first, with partition, offset, timestamp, key, value, and headers
- **F5-B2** User chooses a value representation → system displays the value as text, formatted JSON, or base64; invalid JSON is identified without hiding the original value

**Acceptance criteria**
- **F5-AC1** (B1) Given messages in multiple partitions, when the Messages view opens → no more than 50 records are shown newest first, with each record's partition, offset, timestamp, key, value, and headers
- **F5-AC2** (B2) Given a message with UTF-8 JSON content, when the user selects text, JSON, or base64 → the value is rendered in that representation; selecting JSON for invalid JSON shows a clear invalid-JSON indication and keeps the value inspectable

**External dependencies:** Gateway HTTP API and Kafka record-fetch APIs; UI tests fake the gateway with MSW, gateway unit tests fake Kafka ports, integration tests use the existing testcontainers Kafka setup

### F6 — Read from a position
Read a bounded batch from a chosen partition and offset or timestamp.

**Behaviors**
- **F6-B1** User chooses a partition and starting offset or timestamp → system reads at most 50 messages beginning at that position
- **F6-B2** User supplies an invalid partition or position → system reports a clear validation error without starting a read

**Acceptance criteria**
- **F6-AC1** (B1) Given a valid partition and offset, when the user starts reading → at most 50 messages from that offset onward are shown in offset order
- **F6-AC2** (B1) Given a valid partition and timestamp, when the user starts reading → at most 50 messages beginning at the first available record at or after that timestamp are shown in offset order
- **F6-AC3** (B2) Given an invalid partition, offset, or timestamp, when the user starts reading → the gateway returns a client error and the UI presents the validation detail

**External dependencies:** Gateway HTTP API and Kafka record-fetch/offset APIs; UI tests fake the gateway with MSW, gateway unit tests fake Kafka ports, integration tests use the existing testcontainers Kafka setup

### F7 — Search messages
Search recent records in a topic without scanning the whole log.

**Behaviors**
- **F7-B1** User submits non-empty text in a topic's Messages view → the gateway searches key and value bytes for that case-sensitive UTF-8 text within at most 500 recent offset positions across the whole topic, allocating the window fairly among partitions
- **F7-B2** The UI shows matching records, the number of records examined, the 500-position limit, and whether older positions or partitions were excluded; errors are shown with Retry

**Acceptance criteria**
- **F7-AC1** (B1) Given multiple partitions with more than 500 available positions, when a non-empty search runs → the total selected offset window is at most 500, matching keys or values are returned, and excluded positions are reported
- **F7-AC2** (B1) Given an empty query, missing topic, or Kafka failure → the gateway returns an explicit client, not-found, or unavailable error, respectively
- **F7-AC3** (B2) Given a search result → the Messages view displays its matches, scan count, limit, and exclusion status; a failed search offers Retry without showing stale success

**External dependencies:** Gateway HTTP API and Kafka offsets/record fetch; unit tests use fakes and integration tests use the existing Kafka testcontainer.

### F8 — Cross-cluster topic search
Find topics by name across all configured gateways.

**Behaviors**
- **F8-B1** User searches by topic name → each configured gateway is queried independently; case-insensitive substring matches, including internal topics, link to that gateway's topic
- **F8-B2** One gateway fails → its error and Retry are shown without hiding matches from other gateways

**Acceptance criteria**
- **F8-AC1** (B1) Given matching topics in multiple clusters, searching `ORD` lists each matching topic with its cluster and a working topic link
- **F8-AC2** (B2) Given one unreachable gateway and one successful gateway, the successful results remain visible and the failed gateway offers Retry

**External dependencies:** Existing gateway topic-list API; UI tests fake each gateway independently.

### F9 — Message deep link
Copy a link to a specific message in a configured cluster and topic.

**Behaviors**
- **F9-B1** User copies a message link → it identifies the configured gateway, topic, partition, and offset
- **F9-B2** Opening the link reads that position and displays only the exact record; invalid, deleted, compacted, or expired positions are identified instead of displaying a different record

**Acceptance criteria**
- **F9-AC1** (B1) Given a displayed message, copying its link produces a URL containing its gateway, topic, partition, and offset; clipboard failures are visible
- **F9-AC2** (B2) Given a link to an existing record, opening it shows exactly that partition and offset; an invalid or unavailable record shows an explicit error or not-found state

**External dependencies:** Browser clipboard and the existing positioned-read gateway API.

### F10 — Consumer groups
Inspect consumer group state, members, and committed-offset lag.

**Behaviors**
- **F10-B1** User opens a cluster's Consumer groups tab → system lists classic and next-generation consumer groups with state and members, plus per-topic/partition committed offset, log start/end, and lag
- **F10-B2** A partition has no committed offset, an out-of-range commit, or unavailable offsets → its lag is explicitly unknown or unavailable, never silently reported as zero; group-specific errors are shown without inventing results
- **F10-B3** The gateway cannot obtain group data → the tab shows an error with Retry

**Acceptance criteria**
- **F10-AC1** (B1) Given consumer groups and committed offsets, the tab shows each group's name, state, members, and per-partition lag (`end - committed`) sorted deterministically
- **F10-AC2** (B2) A missing commit, commit outside the current log range, or unavailable partition offsets is labelled explicitly and does not display a fabricated lag
- **F10-AC3** (B3) Given a gateway or Kafka failure, the tab displays an error and Retry; a failed individual group is identified

**External dependencies:** Kafka group list/describe and offset APIs (Kafka 3.8+ group-type filtering); UI and action tests use fakes, integration tests use the Kafka testcontainer.

### F11 — Topic consumers
See consumer groups associated with a topic and their lag for that topic.

**Behaviors**
- **F11-B1** User opens a topic's Consumers tab → groups with a current subscription, assignment, or committed offset for the topic appear with their topic-specific partition lag and status
- **F11-B2** No group is associated with the topic → an explicit empty state is shown; group-data failures remain visible

**Acceptance criteria**
- **F11-AC1** (B1) Given groups associated with several topics, the Consumers tab shows only groups associated with this topic and only this topic's partition rows
- **F11-AC2** (B2) An empty result and gateway or individual-group errors are distinguishable; retry is available for gateway failures

**External dependencies:** The F10 group API and configured gateway.

### F12 — Gateway authentication
Gateways accept only authenticated requests · *detailed when M5 starts*

### F13 — Produce message
Produce a test message (key, value, headers) to a topic · *detailed when M5 starts*

### F14 — Create or delete topic
Create or delete a topic · *detailed when M5 starts*
