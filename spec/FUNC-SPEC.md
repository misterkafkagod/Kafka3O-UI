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
Protect each gateway and its Kafka operations with a per-gateway shared bearer token and TLS.

**Behaviors**
- **F12-B1** A gateway starts only with a configured token and usable TLS certificate and key; all requests except liveness and permitted CORS preflights require the token
- **F12-B2** A user enters or removes a gateway token in the UI → it is stored only in that tab's session storage, used only for that HTTPS gateway, and discarded when the session ends
- **F12-B3** A token is missing or rejected, TLS is unavailable, or a request fails → the UI reports the error and allows the user to correct credentials or retry without exposing the token

**Acceptance criteria**
- **F12-AC1** (B1) Missing or invalid tokens receive 401; valid tokens reach the API; anonymous liveness and allowed-origin preflight still work; gateway startup fails without a valid token or TLS configuration
- **F12-AC2** (B2) Token entry, replacement, removal, session storage, HTTPS-only requests, per-gateway isolation, and query-cache reset work without putting tokens in URLs or config files
- **F12-AC3** (B3) Authentication, TLS, and gateway failures are visible; authenticated redirects are not followed; the gateway does not log or return the token

**External dependencies:** TLS certificate and private key supplied by the deployment; a strong token supplied through the gateway environment. The shared token grants the same read/write access to everyone who holds it; there are no per-user roles.

### F13 — Produce message
Produce a UTF-8 test message to an existing topic.

**Behaviors**
- **F13-B1** User enters a value, optionally includes a key, adds zero or more headers, and submits → the gateway produces one message and reports its partition and exact offset
- **F13-B2** Validation or delivery fails → the UI reports the failure and does not automatically retry; an unconfirmed delivery may already have succeeded

**Acceptance criteria**
- **F13-AC1** (B1) A valid authenticated submission produces the specified UTF-8 bytes, including empty values and an optional empty key, and displays the returned partition and decimal offset
- **F13-AC2** (B2) Invalid input is rejected, repeated submission is disabled while pending, and failures explicitly warn when delivery cannot be confirmed

**External dependencies:** An authenticated gateway and a writable Kafka topic. Producing null values/tombstones is outside this feature.

### F14 — Create or delete topic
Create topics and request deletion after confirmation.

**Behaviors**
- **F14-B1** User supplies a topic name, partition count, and replication factor → the gateway requests topic creation and reports the result
- **F14-B2** User confirms deletion in a dialog → the gateway requests deletion; canceling the dialog sends no request
- **F14-B3** Validation, conflicts, missing topics, or broker failures are displayed without automatic retries or claims that an unconfirmed operation failed definitively

**Acceptance criteria**
- **F14-AC1** (B1) Valid authenticated input requests topic creation with the requested partition count and replication factor; invalid or duplicate names are reported
- **F14-AC2** (B2) Deletion requires confirmation; canceling is a no-op; successful requests clearly indicate deletion may be asynchronous
- **F14-AC3** (B3) Failures are visible, duplicate submissions are prevented while pending, and cached topic lists are refreshed after successful writes

**External dependencies:** An authenticated gateway and Kafka permissions to create or delete topics. Deletion behavior depends on broker configuration.

### F18 — Navigation and context
Navigate every page through a consistent application shell with current cluster/topic context.

**Behaviors**
- **F18-B1** User navigates between clusters, topics and consumer groups → the shell shows the current context, accurate breadcrumbs and the active navigation section
- **F18-B2** User opens an existing URL directly or uses browser Back/Forward → the appropriate page and contextual navigation are restored without changing the existing route contract

**Acceptance criteria**
- **F18-AC1** (B1) Given any existing page, its shell provides consistent global navigation and identifies the active section; cluster and topic pages show the correct context and breadcrumb destinations
- **F18-AC2** (B2) Given existing cluster, topic and exact-message links, direct navigation and browser Back/Forward resolve to the correct page, including topic names requiring URL encoding

**External dependencies:** Existing runtime gateway configuration and React Router routes; no new external integration.

### F19 — Readable, accessible pages
Read and operate every existing page with a consistent visual baseline, responsive layouts and clear states. This milestone supplies shared presentation; F21–F24 later reorganize individual workflows.

**Behaviors**
- **F19-B1** User opens any existing page → typography, surfaces, tables, forms, actions and status indicators follow the same visual language and system light/dark preference
- **F19-B2** User operates the console by keyboard, at increased zoom or on a narrow screen → navigation, content and actions remain accessible
- **F19-B3** Data loads, is absent, fails or only partially succeeds → the interface distinguishes those conditions and offers appropriate recovery without misleading status or metrics

**Acceptance criteria**
- **F19-AC1** (B1) Given either system theme, normal text contrast is at least 4.5:1, large text at least 3:1, and essential control boundaries/focus indicators at least 3:1 against adjacent colors; controls have accessible names and status indicators include text rather than relying on color alone
- **F19-AC2** (B2) Given viewport widths of 320, 768 and 1440 CSS pixels and a separate 200% zoom check, content and actions remain available without page-wide horizontal overflow; wide tables may scroll inside labeled regions. Keyboard users can skip navigation, reach and operate controls in a logical order, and see focus; reduced-motion preference is respected
- **F19-AC3** (B3) Given loading, no configured gateways, empty data, no search matches, authentication failure, gateway failure, cluster failure or partial cross-cluster results, the appropriate state is shown with recovery where applicable; unavailable data is not displayed as zero or healthy, and one failed gateway does not hide another gateway's results

**External dependencies:** Existing query states and gateway errors; browser media queries and semantic HTML. Accessibility checks use component tests and real-browser verification.

### F20 — Gateway connection panel
Manage gateway connections in a dedicated, keyboard-accessible panel rather than permanent forms in the header.

**Behaviors**
- **F20-B1** User opens connection management from the shell or an authentication prompt → a dedicated panel shows gateway context, masked token entry and whether a token is stored
- **F20-B2** User enters, replaces or removes a token → only that gateway's tab-session credentials change and the existing gateway query caches are reset
- **F20-B3** Credentials are rejected or a transport request fails → the interface provides appropriate correction or troubleshooting guidance without exposing credentials or disabling other gateways

**Acceptance criteria**
- **F20-AC1** (B1) Given a closed panel, its entry point remains available without exposing the token forms on every page; opening from a gateway prompt identifies that gateway. The dialog has an accessible name, sensible initial focus, contained keyboard focus, Escape/close behavior and focus restoration to its invoker
- **F20-AC2** (B2) Given separate tokens for two gateways, entering, replacing and removing one preserves the other's credentials; tokens remain masked and confined to the existing tab-session storage for configured HTTPS gateways, never URLs, runtime config or persistent local storage, and credential changes retain the existing cache-reset behavior
- **F20-AC3** (B3) Given invalid input or a 401 response, the user can correct credentials with an explicit error; given a generic transport failure, network/TLS troubleshooting is offered without claiming to identify its cause reliably. No certificate bypass is introduced, no token is exposed, and another gateway remains usable

**External dependencies:** Existing gateway authentication and browser session storage; browser dialog/focus facilities. Browser-trusted gateway TLS remains a deployment requirement.

### F21 — Investigation overview and detail pages
Explore clusters, brokers, topics and configuration through organized, dense overview/detail pages, retaining topic filtering and cross-cluster search.

### F22 — Message investigation workspace
Read and search messages in a compact result list with a selected-record inspector for payload formats, headers and exact position, retaining positioned reads, bounded scans and message links.

### F23 — Consumer investigation
Inspect consumer groups and partition lag through summary-to-detail navigation, preserving explicit unknown, unavailable and missing-commit states.

### F24 — Contextual write workflows
Produce messages and create or delete topics through contextual forms with confirmation, pending-state protection and explicit confirmed, asynchronous or uncertain outcomes.
