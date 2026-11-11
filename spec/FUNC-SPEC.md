# Functional Spec

M1–M9 describe the implemented baseline. F27–F31 specify the planned M10 release; they do not claim that login, roles, Production protection or user auditing are deployed. In M10 secured mode, F29/F30 authorization applies to every existing read/write feature and F31 records sensitive operations; F12's shared-token/manual-proxy paths cannot remain an alternative route around those checks.

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
- **F1-B8** A network or non-404 server failure loading `/config.json` → page shows a configuration-unavailable error with Retry instead of claiming no gateways are configured

**Acceptance criteria**
- **F1-AC1** (B1) Given a config with gateways "dev" and "prod", when the UI opens → two cards labelled "dev" and "prod" are shown
- **F1-AC2** (B2) Given a gateway whose cluster has 3 brokers, when its card loads → it shows "Healthy", the cluster ID and "3 brokers"
- **F1-AC3** (B3) Given "dev" healthy and "prod" timing out, when the page loads → "dev" shows Healthy and "prod" shows "Gateway unreachable"
- **F1-AC4** (B4) Given a gateway returning 503 with code `cluster_unreachable`, when its card loads → it shows "Cluster unreachable" and the message
- **F1-AC5** (B5) Given a Healthy card, when its gateway starts failing and 15 s pass → the card changes to "Gateway unreachable" without a reload
- **F1-AC6** (B6) Given `/config.json` returns 404 or `{"gateways":[]}`, when the UI opens → "No gateways configured" is shown
- **F1-AC7** (B7) Given a gateway configured with TLS and SASL SCRAM-SHA-512 credentials for a cluster that requires them, when its card loads → it shows "Healthy"
- **F1-AC8** (B4) Given a card showing Healthy, when that cluster's Kafka stops while its gateway keeps running → within 15 s the card shows "Cluster unreachable"
- **F1-AC9** (B8) Given a network or non-404 server failure loading `/config.json`, the UI reports that configuration is unavailable and offers Retry without showing "No gateways configured"

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
- **F12-B4** For the explicitly enabled local manual-test build only, a loopback proxy supplies each test Gateway's token and verifies its TLS certificate; the browser receives neither token

**Acceptance criteria**
- **F12-AC1** (B1) Missing or invalid tokens receive 401; valid tokens reach the API; anonymous liveness and allowed-origin preflight still work; gateway startup fails without a valid token or TLS configuration
- **F12-AC2** (B2) Token entry, replacement, removal, session storage, HTTPS-only requests, per-gateway isolation, and query-cache reset work without putting tokens in URLs or config files
- **F12-AC3** (B3) Authentication, TLS, and gateway failures are visible; authenticated redirects are not followed; the gateway does not log or return the token
- **F12-AC4** (B4) With the manual-test build flag enabled on the exact `http://localhost:5173` origin, only the two designated same-origin test-proxy routes are allowed, no browser token is read or sent, and proxy failures are reported. Normal builds retain the HTTPS-only behavior

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
- **F20-B4** In the opt-in local manual-test build, automatically authenticated test connections are identified without displaying token-entry controls

**Acceptance criteria**
- **F20-AC1** (B1) Given a closed panel, its entry point remains available without exposing the token forms on every page; opening from a gateway prompt identifies that gateway. The dialog has an accessible name, sensible initial focus, contained keyboard focus, Escape/close behavior and focus restoration to its invoker
- **F20-AC2** (B2) Given separate tokens for two gateways, entering, replacing and removing one preserves the other's credentials; tokens remain masked and confined to the existing tab-session storage for configured HTTPS gateways, never URLs, runtime config or persistent local storage, and credential changes retain the existing cache-reset behavior
- **F20-AC3** (B3) Given invalid input or a 401 response, the user can correct credentials with an explicit error; given a generic transport failure, network/TLS troubleshooting is offered without claiming to identify its cause reliably. No certificate bypass is introduced, no token is exposed, and another gateway remains usable
- **F20-AC4** (B4) Automatic test connections explain that their credentials are managed by the local proxy; other configured gateways retain their normal credential controls

**External dependencies:** Existing gateway authentication and browser session storage; browser dialog/focus facilities. Browser-trusted gateway TLS remains a deployment requirement except for the opt-in manual-test proxy, which verifies Gateway TLS itself.

### F21 — Investigation overview and detail pages
Explore clusters, brokers, topics and configuration through organized, dense overview/detail pages, retaining topic filtering and cross-cluster search.

**Behaviors**
- **F21-B1** User opens the cluster overview or searches across gateways → each gateway has a readable, independently updated status and matching topics remain available when another gateway fails
- **F21-B2** User opens a cluster's brokers → the page groups its gateway and cluster identity, controller and broker information without presenting unavailable data as a metric
- **F21-B3** User browses topics or a topic's details → filtering, partition information and configuration are organized for scanning while existing topic actions and links remain available

**Acceptance criteria**
- **F21-AC1** (B1) Given multiple gateways, the responsive overview identifies each gateway and its actual loading, health or error state; available cluster metadata and broker counts are shown only on success. Cross-cluster topic search retains independent results and recovery when another gateway fails.
- **F21-AC2** (B2) Given a healthy cluster, the broker page shows its gateway, cluster ID, controller and broker count with the sorted, accessible broker table. Loading or failure does not display stale success or a fabricated count.
- **F21-AC3** (B3) Given topics and a selected topic, the topic list retains case-insensitive filtering, internal-topic visibility, sorted and encoded links, and approximate counts. The detail page keeps partition offsets, replicas and configuration readable, hides sensitive configuration values, and preserves existing create/delete actions and failure states.

**External dependencies:** Existing gateway cluster and topic APIs, runtime gateway configuration and navigation routes. No new gateway endpoint is required.

### F22 — Message investigation workspace
Read and search messages in a compact result list with a selected-record inspector for payload formats, headers and exact position, retaining positioned reads, bounded scans and message links.

**Behaviors**
- **F22-B1** User reads recent or positioned messages → a compact, keyboard-operable result list selects a record for inspection without expanding every payload
- **F22-B2** User searches recent messages → matching records use the same inspector and retain the bounded-scan explanation and failure recovery
- **F22-B3** User opens or copies an exact message link → the inspector shows only the verified record and preserves its partition and decimal offset

**Acceptance criteria**
- **F22-AC1** (B1) Given message results, each record is represented in result order and the first is selected initially; selecting another by mouse or keyboard updates a responsive inspector without another read. The inspector shows timestamp, partition, exact offset or its unavailability, key, value and headers, including null and empty values, with the existing text, JSON and base64 formats. A changed result set cannot leave a stale or wrongly identified record selected.
- **F22-AC2** (B2) Given a search, the existing case-sensitive, bounded scan, examined count, truncation status, empty and retry states remain accurate; matching records use the same selectable inspector and no additional search is triggered by selection.
- **F22-AC3** (B3) Given a direct link, only a message verified at its exact partition and decimal offset is inspected; unavailable or unverifiable positions remain explicit. Copying a selected record's link preserves encoded gateway/topic names and exact offsets, and an unavailable exact position cannot produce a misleading link.

**External dependencies:** Existing message read/search APIs and browser clipboard and navigation facilities. Kafka records and offsets are not modified by inspection.

### F23 — Consumer investigation
Inspect consumer groups and partition lag through summary-to-detail navigation, preserving explicit unknown, unavailable and missing-commit states.

**Behaviors**
- **F23-B1** User opens cluster consumer groups → a compact summary links to each group's existing member and partition-lag details
- **F23-B2** User opens a topic's consumers → the same summary and details show only known associations for that topic, while unresolved associations remain visible

**Acceptance criteria**
- **F23-AC1** (B1) Given consumer groups, the overview identifies each group and its reported state and links to its details. Members, exact decimal offsets, missing commits, out-of-range and unavailable lag remain distinct; loading, empty, gateway-error and individual-group-error states retain their existing recovery.
- **F23-AC2** (B2) Given a topic, the overview includes only associated groups and topic-specific partition rows. Unknown associations and incomplete data remain explicit and retryable; an unresolved association is not presented as a definite empty result.

**External dependencies:** Existing consumer-group snapshots and topic association logic; no offset reset or new gateway API.

### F24 — Contextual write workflows
Produce messages and create or delete topics through contextual forms with confirmation, pending-state protection and explicit confirmed, asynchronous or uncertain outcomes.

**Behaviors**
- **F24-B1** User creates a topic → a contextual form presents the existing topic settings and the accepted or uncertain outcome
- **F24-B2** User produces a message → a contextual form presents the destination, payload, optional key and headers, and the exact acknowledged position or uncertain outcome
- **F24-B3** User requests deletion → a clearly identified destructive action retains the existing confirmation and asynchronous or uncertain outcome

**Acceptance criteria**
- **F24-AC1** (B1) The create form identifies its gateway, keeps name and numeric validation, disables duplicate pending requests, reports acceptance, conflict or uncertain failure accurately, and refreshes topic lists.
- **F24-AC2** (B2) The produce form identifies its topic and gateway, preserves empty values, optional keys and headers, prevents duplicate pending submissions, reports an exact acknowledged position or possible delivery, and never retries a write automatically.
- **F24-AC3** (B3) The delete action identifies the topic and consequences, requires the existing confirmation, sends nothing on cancellation or unavailable confirmation, prevents repeated pending/accepted requests, and distinguishes accepted asynchronous deletion from an uncertain failure.

**External dependencies:** Existing authenticated topic-create, message-produce and topic-delete APIs, and the browser confirmation facility.

### F25 — Kafka configuration
Inspect effective per-broker and per-topic Kafka settings and change only editable, non-sensitive entries. Gateway connection settings and cluster-wide broker defaults are not edited.

**Behaviors**
- **F25-B1** User selects a broker or opens a topic's management page → the UI lists searchable Kafka settings with effective value, source, type/documentation when supplied, and editability; sensitive values are hidden and restart-required entries are read-only.
- **F25-B2** User sets an editable value or resets this resource's dynamic override → the UI identifies the target and requires confirmation; the gateway reads current editability and asks Kafka to validate before submitting once.
- **F25-B3** A write cannot be confirmed → the UI explains it may have taken effect, blocks another submission until the configuration is successfully refreshed, and never retries automatically.

**Acceptance criteria**
- **F25-AC1** Broker selection scopes settings to the selected broker; topic settings are scoped to that topic. Sensitive values and documentation are not exposed, and `auto.create.topics.enable` cannot be changed when Kafka reports it read-only.
- **F25-AC2** Cancelling or failing confirmation sends no write. Read-only, sensitive, invalid and Kafka-rejected changes never reach the apply step. Reset removes only a local topic or per-broker override, not inherited defaults.
- **F25-AC3** Pending submissions cannot be duplicated; acceptance is not presented as verified propagation. Unknown outcomes require a successful refresh before another submission.

**External dependencies:** Authenticated gateway configuration APIs and Kafka DescribeConfigs/IncrementalAlterConfigs permissions.

### F26 — Topic partitions and replica placement
Increase the total partition count or choose the ordered replica broker IDs for one partition, with explicit consequences and reassignment status.

**Behaviors**
- **F26-B1** User requests a larger total count → the UI warns that increases are irreversible and may affect keyed routing and ordering, requires confirmation, and the gateway validates before one apply.
- **F26-B2** User chooses a partition and nonempty, unique, existing broker IDs → the UI warns that data may move and durability can change. The gateway rejects a currently active reassignment and never interprets an empty list as cancellation.
- **F26-B3** The UI displays active reassignments and polls their status; acceptance means the request was accepted, not that data movement is complete. Uncertain outcomes require a successful topic, broker and status refresh before another submission.

**Acceptance criteria**
- **F26-AC1** Invalid counts, nonexistent brokers, duplicate/empty IDs, unchanged assignments, or an active reassignment cause no write. Replica assignment is disabled when its status is unavailable. Cancelling confirmation causes no write.
- **F26-AC2** A successful request is not retried automatically, pending requests cannot be duplicated, and a timeout is reported as potentially accepted rather than failure.
- **F26-AC3** Multi-broker placement is covered by fake-broker tests; the two persistent single-broker test clusters cannot prove replication across brokers.

**External dependencies:** Authenticated gateway, Kafka metadata/CreatePartitions/AlterPartitionReassignments/ListPartitionReassignments permissions, and the browser confirmation facility.

### F27 — Local and Cognito sign-in (planned M10)
Sign in to one Console session with a local account or Amazon Cognito, without handling Kafka/Gateway credentials.

**Behaviors**
- **F27-B1** User selects local login and supplies credentials → the backend authenticates an enabled, administrator-provisioned account and creates a server-side session; invalid attempts get a generic visible error and throttling.
- **F27-B2** User selects Cognito SSO → the backend completes a validated OIDC authorization-code flow and links the verified issuer/subject to an application identity; no automatic role is granted to an unknown identity.
- **F27-B3** User logs out, an account is disabled, or a session expires/is revoked → subsequent requests are denied, displayed data/caches are cleared, and a pending write is never replayed after login.
- **F27-B4** An administrator bootstraps the first global ADMIN or resets a local password → a controlled, audited flow replaces any temporary credential and revokes existing sessions; public registration and automatic email-based local/SSO account merging are not provided.

**Acceptance criteria**
- **F27-AC1** (B1) Valid local credentials establish an opaque HttpOnly session; invalid/disabled users cannot sign in. Passwords are stored as salted, adaptive hashes, never plaintext. Login/reset throttling, password-change and logout paths are tested without logging credentials.
- **F27-AC2** (B2) A Cognito-compatible authorization flow validates state, nonce, PKCE, signature, issuer, intended client, token use and expiry in controlled tests. Wrong-pool/client, expired, forged and replayed callbacks fail. User Pool group names map only through administrator-configured bindings; local login remains available during an IdP outage. Real Cognito compatibility remains unverified until a User Pool is available.
- **F27-AC3** (B3) Logout/revocation immediately invalidates the application session on the next request, including direct Gateway access. An unavailable or expired session yields 401, not a Kafka call. Local logout also offers the configured Cognito sign-out flow without claiming it signs out every federated upstream provider.
- **F27-AC4** (B4) Bootstrap cannot be reused or create a default password; role-free first SSO login reveals no clusters. Reset/disable/revoke events are audited. Cognito identity, local account and Kafka principal remain explicitly distinct.

**External dependencies:** Amazon Cognito User Pool/app client and managed login, verified HTTPS callback/logout configuration, and central durable identity/session storage. Provider configuration and live callback tests require discovery; direct integrations with other providers are F42.

### F28 — Global and per-cluster access management (planned M10)
An authorized administrator can provision users, map Cognito groups and control global/per-cluster access.

**Behaviors**
- **F28-B1** A global ADMIN opens Access management → they can manage local accounts, application identities, sessions, Cognito group mappings, and global or cluster-scoped role bindings.
- **F28-B2** A user has global and/or cluster grants → the system computes the highest granted role for the target cluster; no binding means no access, and a cluster ADMIN grant does not grant Console-wide identity/policy administration.
- **F28-B3** An administrator changes access → confirmation identifies the affected subject and scope, and the next authorization decision uses the committed policy; unauthorized/self-escalating requests are rejected and audited.

**Acceptance criteria**
- **F28-AC1** (B1) Users cannot self-register or assign their own roles. A cluster ADMIN cannot manage global grants, classify clusters, or edit Cognito mappings. The last enabled local global ADMIN cannot be removed/demoted without the documented recovery procedure.
- **F28-AC2** (B2) A global VIEWER plus ADMIN on cluster A can read all clusters but write Production A only; it cannot write Production B. Global ADMIN covers all clusters. A cluster VIEWER grant does not restrict a pre-existing global OPERATOR/ADMIN grant; the UI explains this additive model before saving.
- **F28-AC3** (B3) Disabling a user, revoking an app session, or changing local role/group mappings affects subsequent requests without trusting stale browser permissions. Removing Cognito group membership is reflected on a new verified provider token within the documented refresh bound, not claimed to be an immediate provider push.
- **F28-AC4** (B1–B3) The management UI identifies grants by source/scope and distinguishes 401, 403, save conflicts and service failures. Canceling sends no mutation; policy changes produce redacted before/after audit entries.

**External dependencies:** Central policy/identity store and verified Cognito group claims; the initial roles are VIEWER, OPERATOR and ADMIN, not a custom policy-language editor.

### F29 — End-to-end Gateway authorization (planned M10)
Every protected cluster request is authorized for its actual user, action and target, including requests made outside the UI.

**Behaviors**
- **F29-B1** User opens a permitted cluster or submits an action → the Console backend authenticates the session and forwards a target-bound user delegation; the Gateway independently obtains a current authorization decision before calling Kafka.
- **F29-B2** User lacks permission or supplies a forged, expired, replayed or wrong-cluster delegation → the Gateway denies the request without calling the Kafka action; the UI explains the restriction instead of presenting it as an unavailable broker.
- **F29-B3** Policy, delegation validation or required durable auditing is unavailable → the request fails closed with an explicit service error, with no fallback to a shared token or automatic write retry.

**Acceptance criteria**
- **F29-AC1** (B1) All current API actions, including metadata/messages/config reads and every F13/F14/F25/F26 write, have explicit action mappings. Unknown/new routes default to deny; only documented anonymous liveness/necessary preflight remain exempt.
- **F29-AC2** (B2) Missing identity returns 401; authenticated but forbidden returns 403. Direct API tests, changed paths/body/cluster IDs, forged user/role headers, stale capabilities, shared tokens and the old automatic proxy cannot bypass authorization. Rejected requests make zero Kafka action calls.
- **F29-AC3** (B1–B3) Roles are enforced identically for local and Cognito identities. Kafka credentials stay in their Gateway; a valid Console permission cannot override Kafka ACLs, sensitive/read-only configuration, validation or active-reassignment safeguards.
- **F29-AC4** (B3) A policy/audit outage reports unavailability instead of a false permission denial or success. Logout or access revocation is respected on the next decision; a request already authorized/in flight is not promised to be canceled.

**External dependencies:** An authenticated, verified-TLS Console/Gateway delegation and policy interface; exact trust and cutover contracts are in the planned technical spec.

### F30 — Production classification and mutation guard (planned M10)
Use a server-owned Production flag to require an effective ADMIN role for Kafka mutations only in Production.

**Behaviors**
- **F30-B1** A global ADMIN classifies a registered cluster → server policy records Production or non-Production with confirmation, a reason and an audit event; every cluster page/action displays the authoritative environment.
- **F30-B2** A non-ADMIN tries a Kafka mutation in Production → both Console and Gateway deny it; permitted read-only investigation remains available.
- **F30-B3** An ADMIN for the Production cluster confirms a supported mutation and supplies a reason → normal action permissions/validation still apply, and intent/outcome are audited.

**Acceptance criteria**
- **F30-AC1** (B1) Classification is persisted and cannot be changed through browser config, query parameters, a cluster display name, spoofed headers or a cluster-only ADMIN role. Existing clusters must be classified during migration; missing/unknown classification blocks writes rather than defaulting to non-Production.
- **F30-AC2** (B2) Non-ADMIN Production requests to produce, create/delete topics, alter broker/topic settings, increase partitions or reassign replicas receive 403 and make zero Kafka write calls. Denials are audited; every future Kafka mutation must opt into the same guard.
- **F30-AC3** (B2–B3) VIEWER is read-only everywhere. OPERATOR may perform supported writes in non-Production but cannot in Production. Cluster ADMIN only overrides the Production guard within its assigned cluster; global ADMIN covers all clusters.
- **F30-AC4** (B3) ADMIN cannot bypass read-only/sensitive settings, Kafka ACLs, irreversible-operation warnings or confirmation. Canceling or omitting the Production change reason causes no write. Promoting a cluster to Production affects requests authorized after the classification commit; already in-flight operations remain visible in audit.

**External dependencies:** F28 policy administration, F29 enforcement and F31 durable auditing. This feature classifies Console policy; it does not change broker configuration or deployment topology.

### F31 — Security and operation audit trail (planned M10)
Inspect who authenticated, changed access, attempted a protected action or requested a Kafka mutation, and what is known about its outcome.

**Behaviors**
- **F31-B1** A security event or Kafka mutation is attempted → the responsible backend/Gateway records correlated structured audit events with actor, authentication source, cluster/environment, action/resource, decision, time, reason and outcome.
- **F31-B2** An authorized user opens Audit → they can filter by time, actor, cluster, action and outcome, inspect a correlated event timeline, and export only their authorized scope.
- **F31-B3** A mutation outcome cannot be confirmed or an audit component fails → the UI reports uncertainty/unavailability explicitly; an audit failure never turns an accepted Kafka request into a definite failure or triggers a retry.

**Acceptance criteria**
- **F31-AC1** (B1) Successful/failed login, logout/revocation, account/role/group-mapping changes, environment changes, authorization denials and all Kafka mutation attempts/outcomes are recorded. Invalid anonymous attempts use an anonymous actor, not a fabricated username. Permitted read-only polling does not create per-poll audit noise in M10.
- **F31-AC2** (B1) No Kafka mutation starts before a durable authorized intent is recorded. Events distinguish denied, validation-rejected, accepted, confirmed, failed-before-send and unknown; accepted is not completion. An incomplete intent after restart is surfaced as unresolved, never automatically replayed.
- **F31-AC3** (B2) Global ADMIN can inspect global audit; cluster ADMIN can inspect only its cluster's operational audit, not global identity/security events. Audit reads/exports require backend authorization and are themselves audited; operators cannot alter/delete records through the application.
- **F31-AC4** (B1–B3) Passwords, bearer/session/delegation tokens, message keys/values/headers and sensitive setting values never appear in audit or application logs. Sanitized metadata survives backend/Gateway restarts; retention, SQLite-consistent backup/restore, restricted file access and append-only application permissions are verified. SQLite has no database-user privilege separation, and an administrator or process with database-file access can alter the underlying storage.
- **F31-AC5** (B3) Audit unavailability before dispatch blocks mutation. If Kafka may have accepted a request but the outcome cannot be durably appended, the client sees an unknown result with a correlation ID; the existing intent remains inspectable and operational alerts identify the persistence failure.

**External dependencies:** Durable central audit storage with restricted file access and application-authorized reads/writes, server time and correlation IDs; retention/export policy and deployment provisioning remain discovery decisions.

### F46 — Streamlined signed-in navigation (planned M11)
Work signed in without a permanent session card, reach administration on its own page only when permitted, and land on a cluster's topics first.

**Behaviors**
- **F46-B1** User completes sign-in → the session card is replaced by a compact indicator in the header's right corner showing "Signed in as <username>" and Sign out; sign-in, password change, unavailable and uncertain states keep the full card
- **F46-B2** User opens Administration from the header → a separate page shows Access management, Cluster classification and Audit to a global ADMIN, and only Audit for their permitted clusters to a cluster ADMIN; other users see no Administration link, and opening its address directly shows "Not permitted"; administration sections no longer appear below other pages
- **F46-B3** User opens a cluster → the Topics tab is first and selected; tabs are ordered Topics, Brokers, Consumer groups, Broker configuration, and Brokers has its own address
- **F46-B4** User views a cluster's topic list → "Create topic" is visually separated from the filters below it, whether collapsed or open

**Acceptance criteria**
- **F46-AC1** (B1) Given a signed-in session that does not need a password change, no session card is shown; the header shows the username and an accessible Sign out button, readable at 320, 768 and 1440 CSS pixels without page-wide horizontal overflow; signing out still returns to the sign-in card
- **F46-AC2** (B2) Given a global ADMIN, the Administration page shows all three sections; given a cluster ADMIN without a global grant, it shows only Audit; given any other user, there is no Administration link and `/administration` shows "Not permitted" without requesting administration data. The Console continues to authorize every administration request on the server, so the link's visibility is a convenience, not a security control, and a grant change takes effect on the next session check
- **F46-AC3** (B3) Given `/clusters/<id>`, the Topics tab is selected and listed first; given `/clusters/<id>/brokers`, the brokers and controller are shown; existing topic, consumer-group and configuration addresses keep working
- **F46-AC4** (B4) Given the topic list with "Create topic" collapsed or expanded, at least 1rem of space separates it from the filters

**External dependencies:** The Console session endpoint, which reports the session's administration capabilities (Gateway repository change); faked in UI tests with MSW.

### F45 — Appearance preferences (planned M11)
Choose the console's color mode, color theme, font, text size and density, remembered per browser and chosen by each user.

**Behaviors**
- **F45-B1** User opens Appearance from the header or the sign-in screen and picks Light, Dark or Match system → the choice applies immediately, and Match system follows operating-system changes live
- **F45-B2** User picks a color theme (Blue, the default; Slate; Teal; High contrast) → it applies in both light and dark mode
- **F45-B3** User picks a font (System, the default; Hyperlegible; Serif) and a text size (Small 87.5%, Default 100%, Large 112.5%, Extra large 125%) → the console uses them
- **F45-B4** User picks a density (Comfortable, the default; Compact) → Compact tightens table rows, list rows and cards
- **F45-B5** User reloads, opens a new tab or restarts the browser → the saved choices are restored; a change in one tab updates other open tabs; Reset restores the defaults
- **F45-B6** Browser storage is blocked or holds a broken value → the console uses the defaults, works normally and says that choices cannot be saved

**Acceptance criteria**
- **F45-AC1** (B1) Given Light while the operating system is dark, the light colors are used; given Match system, changing the operating-system theme updates the page without a reload; the control is a labeled, keyboard-operable group
- **F45-AC2** (B2) Every theme in both light and dark meets the F19-AC1 thresholds, verified by an automated test over every foreground/background token pair; High contrast reaches at least 7:1 for normal text; status indicators keep their text labels
- **F45-AC3** (B3, B4) Given every text size, F19-AC2 holds, including at 320 CSS pixels; Compact density keeps every interactive target at least 24×24 CSS pixels
- **F45-AC4** (B5) Given saved choices, they are applied before the first render without a flash of the default theme; a change in one tab appears in the others; Reset removes the stored value
- **F45-AC5** (B6) Given storage that throws, or a stored value that is malformed or has unknown fields or values, valid fields are kept, the rest fall back to defaults, and a "Preferences can't be saved in this browser" notice appears when saving fails
- **F45-AC6** (B5) The stored value contains only the five appearance choices and no identity, cluster or credential; everyone using the same browser profile shares it, signing out does not clear it, and it applies in every build mode including the sign-in screen

**External dependencies:** Browser `localStorage`, the `storage` event and `prefers-color-scheme`; faked in Vitest. One bundled font file (Atkinson Hyperlegible, SIL Open Font License 1.1) served from the UI's own origin.

### F47 — No Gateway credentials in the secured console (planned M12)
The secured console has no Gateway credentials control, because every cluster is reached through the Console.

**Behaviors**
- **F47-B1** User opens the secured console → the header has no Gateway credentials control and no prompt offers token entry; the legacy and preview builds keep their current behavior

**Acceptance criteria**
- **F47-AC1** (B1) Given the secured build, no page shows a Gateway credentials control or token-entry prompt; given the legacy build, the control still opens the credentials panel

**External dependencies:** none.

### F15 — Consumer offset reset (planned M12)
Reset an inactive consumer group's committed offsets for one topic to earliest, latest or a timestamp after previewing the change, under Console roles, Production rules and audit.

**Behaviors**
- **F15-B1** User opens a consumer group, chooses one of its topics and a target (earliest, latest or a date and time) and asks for a preview → the console shows, per partition, the current committed offset and the offset it would be reset to, without changing anything
- **F15-B2** User confirms the previewed reset → the Gateway rechecks that the group has no members and commits exactly the previewed target offsets; the console shows the confirmed result and the group's new lag
- **F15-B3** The group has active members, the topic or group is unknown, or Kafka rejects the commit → nothing is committed (or the outcome is reported as unknown when Kafka may have accepted it) and the user sees why

**Acceptance criteria**
- **F15-AC1** (B1) Given an inactive group with committed offsets on a topic, a preview for earliest, latest and a timestamp lists every partition with its current and target offsets; a timestamp after the newest record targets the end offset; previews are read-only and need VIEWER
- **F15-AC2** (B2) Given a preview, confirming commits those target offsets and the group's committed offsets then equal them; offsets that moved since the preview are not silently replaced: the apply request carries the previewed targets and the expected current offsets, and a mismatch is refused as stale
- **F15-AC3** (B2) Applying needs OPERATOR on a non-Production cluster, and ADMIN plus a change reason on Production; denials happen before Kafka, and every attempt is audited with its intent and outcome
- **F15-AC4** (B3) Given a group with members at preview or apply time, the reset is refused with "Stop the group's consumers first"; unknown groups or topics return not found; a commit whose outcome is uncertain is reported as unknown with an operation ID

**External dependencies:** Kafka consumer group offset APIs through franz-go/kadm in each Gateway; tests use the existing Kafka integration test setup and fakes.

### F35 — Kafka Connect inspection and lifecycle (planned M12)
Inspect a cluster's Kafka Connect connectors and tasks with their state and errors, and pause, resume or restart them under Console roles, Production rules and audit; configuration values stay hidden.

**Behaviors**
- **F35-B1** User opens a cluster's Connect tab → the console lists its connectors with type, connector state, worker and each task's state, and shows a failed connector's or task's error summary
- **F35-B2** The cluster has no Connect configured, or Connect is unreachable → the tab says "Kafka Connect is not configured for this cluster" or "Kafka Connect is unreachable", without affecting the rest of the cluster pages
- **F35-B3** User pauses, resumes or restarts a connector, or restarts one task → after confirmation the action is sent and the list refreshes to the new state

**Acceptance criteria**
- **F35-AC1** (B1) Given a Connect cluster with running, paused and failed connectors, the list shows each connector's name, type, state and tasks with their states, and a failed item's error summary; no connector configuration value is returned to the browser; reading needs VIEWER
- **F35-AC2** (B2) Given a cluster without a Connect URL, the tab shows "not configured"; given an unreachable Connect, it shows "unreachable" with retry; other cluster pages keep working
- **F35-AC3** (B3) Given a running connector, pause then resume changes its state accordingly; restarting a connector or a single task is accepted and the list reflects the result after refresh
- **F35-AC4** (B3) Lifecycle actions need OPERATOR on non-Production and ADMIN plus a change reason on Production; denials happen before Connect is called, and every attempt is audited with its intent and outcome

**External dependencies:** Kafka Connect REST API behind the cluster's Gateway; `discovery needed` (`kafka-connect-api`, against the EKS-D test worker). Tests fake Connect with an HTTP test server built from discovery fixtures.

### F49 — Topic backups (planned M13)
Start, list, pause, resume and delete continuous backups of a topic's messages to S3-compatible storage through the cluster's Kafka Connect, with Gateway-generated connector configurations and storage credentials that never reach the browser.

**Behaviors**
- **F49-B1** User starts a backup for a topic → the Gateway creates an S3 sink connector for that topic with a generated configuration, and records are written to the cluster's backup location under the topic's path
- **F49-B2** User opens a cluster's Backups tab → each backup is listed with topic, state, storage location and the last time data was written; a cluster without backup storage says so
- **F49-B3** User pauses, resumes or deletes a backup → the connector changes accordingly; deleting removes only the job, never the stored data

**Acceptance criteria**
- **F49-AC1** (B1) Given a topic without a backup, starting one creates exactly one backup connector for it and objects with the topic's records (key, value, headers, timestamp) appear in storage; starting a second backup for the same topic is refused; no storage credential or connector configuration value is returned to the browser
- **F49-AC2** (B2) Given running, paused and failed backups, the list shows each with its state and error summary, storage path and last write time; a cluster without backup storage shows "Backups are not configured for this cluster"
- **F49-AC3** (B3) Starting, pausing, resuming and deleting backups need OPERATOR on non-Production and ADMIN plus a reason on Production, are denied before Connect when not allowed, and are audited; deleting a backup keeps its stored objects

**External dependencies:** Kafka Connect with Aiven's S3 sink connector and S3-compatible storage (SeaweedFS on EKS-D); see the [s3-backup-connectors discovery](./discovery/s3-backup-connectors.md).

### F50 — Restore a topic's backup (planned M13)
Restore a topic's backup into that same topic after confirming that restored messages are appended, without the topic's own backup saving the restored copies again.

**Behaviors**
- **F50-B1** User restores a topic's backup → after a confirmation stating that the restored messages are appended to the topic and may duplicate messages still present, the topic's backup is paused, a source connector writes the backup's records into the topic, and the backup resumes when the restore has finished
- **F50-B2** A restore is in progress, fails or cannot be confirmed → the Backups tab shows its state and error, a second restore of the same topic is refused, and an uncertain outcome is reported as unknown

**Acceptance criteria**
- **F50-AC1** (B1) Given a backup with stored records, a confirmed restore appends those records (key, value, headers, timestamp; new offsets in the original partition) to the original topic, each with one added header `kafka3o-restore` naming the restore; canceling the confirmation sends nothing
- **F50-AC2** (B1) Records written by a restore are not saved again by the topic's backup, and the restore reads only the objects that existed when it started
- **F50-AC3** (B2) Restores need OPERATOR on non-Production and ADMIN plus a reason on Production, are audited with intent and outcome, show progress or failure in the Backups tab, and a second concurrent restore of the same topic is refused

**External dependencies:** Aiven's S3 source connector with the Kafka3O unwrap transform on the same Connect worker; see the [s3-backup-connectors discovery](./discovery/s3-backup-connectors.md).

### F52 — Consumer group list and group page (planned M14)
Scan a cluster's consumer groups in one list and open a page per group with its members and its offsets per topic and partition.

**Behaviors**
- **F52-B1** User opens a cluster's Consumer groups tab → a table lists every group with name, state, members, number of topics and total lag, sorted by name
- **F52-B2** User clicks a group in the list → a page for that group shows its members and, for each topic, a table of partitions with committed offset, log start, log end and lag, and that topic's offset reset
- **F52-B3** The group does not exist or its data is incomplete → the group page says so, offers Retry and a link back to the list, and shows no invented rows
- **F52-B4** User clicks a group on a topic's Consumers tab → the same group page opens

**Acceptance criteria**
- **F52-AC1** (B1) Given consumer groups, the list shows one row per group with name, state, members, topic count and total lag; when any partition's lag is unknown, total lag reads "Unknown (n partitions)" and unknown lag is never counted as zero; loading, empty and Gateway-error states keep their recovery
- **F52-AC2** (B2) Clicking a group's row opens `/clusters/:id/consumer-groups/:group`, which shows exact decimal offsets per topic and partition; missing and out-of-range commits keep their labels; offset reset works as in F15
- **F52-AC3** (B3) Given a group name that is not reported, the page says "Consumer group not found" with a link back to the list; a group error shows the error with Retry and no fabricated rows
- **F52-AC4** (B4) A group name on a topic's Consumers tab links to that group's page

**External dependencies:** The existing consumer-group snapshot API; no new Gateway API.

### F41 — Cluster metrics (planned M15)
See a cluster's broker disk use, partition health, topic sizes and throughput on a Metrics tab, only as Kafka reports them, with unavailable values shown as unavailable.

**Behaviors**
- **F41-B1** User opens a cluster's Metrics tab → for each broker and log directory the tab shows the volume's total, used and free space (with % used) and the space Kafka's data takes, refreshed every 10 seconds
- **F41-B2** User looks at partition health → the tab shows the number of topics and partitions, and how many partitions are under-replicated, below min ISR or offline, plus the 10 largest topics by size on disk
- **F41-B3** User keeps the tab open → messages per second for the cluster and per topic are worked out from end offsets between two refreshes; the first refresh says "Measuring…"
- **F41-B4** Kafka cannot answer part of the metrics (access denied, timeout, log directory error) → that part says "Unavailable" with the reason; the other parts still show

**Acceptance criteria**
- **F41-AC1** (B1) Given brokers with log directories, the tab shows one row per broker and directory with total, used (total − free), free and Kafka data size in readable units and % used; values Kafka reports as unknown (-1) read "Unknown", never 0
- **F41-AC2** (B2) Given topics including internal ones, the counts match Kafka's metadata (offline: no leader or partition error; under-replicated: ISR smaller than replicas; below min ISR: ISR smaller than the topic's `min.insync.replicas`), and the largest topics are sorted by total replica size
- **F41-AC3** (B3) Given two refreshes, each topic's rate is (end offset sum change) ÷ (seconds between samples); a decrease (topic recreated or truncated) shows no rate instead of a negative one
- **F41-AC4** (B4) Given a log directory or configuration read that fails, only the affected section reads "Unavailable: <reason>"; a Gateway error shows the usual error with Retry; viewers can see the tab and nothing is audited

**External dependencies:** Kafka admin API through the cluster's Gateway (DescribeLogDirs v5, Metadata, DescribeConfigs, ListOffsets); see the [cluster-metrics-sources discovery](./discovery/cluster-metrics-sources.md).

### F53 — Export cluster metrics (planned M15)
Export a cluster's metrics as a CSV/JSON download from the Metrics tab and through a Prometheus endpoint on the Gateway.

**Behaviors**
- **F53-B1** User clicks Download JSON or Download CSV on the Metrics tab → the browser saves the current metrics with the time they were read
- **F53-B2** A monitoring system scrapes the Gateway's metrics endpoint with its token → it receives the same metrics in Prometheus text format

**Acceptance criteria**
- **F53-AC1** (B1) The JSON file holds the same values as the tab plus `readAt`; the CSV has one row per value (`metric,broker,logDir,topic,value`); files are named `<cluster>-metrics-<UTC time>.json|csv`; unavailable values are left empty, not 0
- **F53-AC2** (B2) With a metrics listener and token configured, `GET /metrics` with `Authorization: Bearer <token>` returns Prometheus text with gauges for log directory bytes, partition counts by state and topic size, and a counter of topic end offsets; a missing or wrong token gets 401; without configuration the listener does not start; the listener serves nothing else

**External dependencies:** the F41 metrics read; Prometheus text exposition format 0.0.4 (no Prometheus server is installed on EKS-D, so checks use `curl`).

### F54 — Topic Backup tab with settings (planned M16)
Set up and manage a topic's backup on that topic's Backup tab, choosing from a fixed set of settings that the Gateway turns into the connector configuration.

**Behaviors**
- **F54-B1** User opens a topic's Backup tab (after Configuration & partitions) → it shows the topic's backup with state, location, last write, size and its settings, or "No backup" with a Start form; a cluster without backup storage says so
- **F54-B2** User starts a backup with settings (start point: oldest message or from now on; compression: gzip, zstd, snappy or none; maximum records per file, which splits the files written at Kafka Connect's 60-second commit; a backup started again for a topic continues where the topic's previous backup job stopped) → the Gateway builds the connector configuration from these choices only
- **F54-B3** User pauses, resumes or deletes the backup from the tab → the same actions as F49-B3 under the same rules

**Acceptance criteria**
- **F54-AC1** (B1) Running, paused, failed and missing backups each show their state and error, and the settings shown are the ones the connector actually uses
- **F54-AC2** (B2) An invalid or out-of-range setting is refused before Connect is called, with a message naming it; the defaults produce exactly the M13 configuration; no browser value reaches the connector configuration except the validated settings
- **F54-AC3** (B3) Starting, pausing, resuming and deleting need the F49-AC3 roles and Production rules and are audited like every other write; the chosen settings stay visible on the topic's Backup tab

**External dependencies:** Aiven S3 sink connector; see the [backup-settings-and-restore-filters discovery](./discovery/backup-settings-and-restore-filters.md) (a flush time cannot be set per connector, so it is not offered).

### F55 — Restore with a time range or partitions (planned M16)
Restore a topic's backup from its Backup tab: everything, only messages in a time range, only chosen partitions, or both.

**Behaviors**
- **F55-B1** User restores everything from the topic's Backup tab → the F50 restore runs
- **F55-B2** User restores a time range (from/to on message timestamps), chosen partitions, or both → after a confirmation naming the selection, only matching records are appended

**Acceptance criteria**
- **F55-AC1** (B1) Behaves as F50-AC1 to F50-AC3, started and followed from the topic's Backup tab
- **F55-AC2** (B2) Only records inside the time range and the chosen partitions are appended, each with `kafka3o-restore`; progress and the automatic finish still work; an empty partition selection, an unknown partition, or a range whose start is after its end is refused before Connect
- **F55-AC3** (B1, B2) A backup written with any offered compression restores losslessly; the restore reads the objects written with the backup's current compression, and the tab says older objects in another compression are not restored

**External dependencies:** Aiven S3 source connector and the Kafka3O restore transform; see the [backup-settings-and-restore-filters discovery](./discovery/backup-settings-and-restore-filters.md).

### F56 — Cluster Backups overview (planned M16)
The cluster's Backups tab lists every backup and leads to each topic's Backup tab.

**Behaviors**
- **F56-B1** User opens the cluster's Backups tab → backups are listed as in F49-B2, each topic links to its Backup tab, and the Start form is replaced by a hint to start backups from a topic

**Acceptance criteria**
- **F56-AC1** (B1) Clicking a backup's topic opens `/clusters/:id/topics/:topic/backup`; the tab offers no start, pause, resume, delete or restore controls

**External dependencies:** none beyond F49.
