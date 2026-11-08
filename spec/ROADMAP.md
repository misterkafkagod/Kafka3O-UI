# Roadmap

## Vision
Kafka3O is a multi-cluster Kafka console for developers and operators: one web UI (Kafka3O-UI) shows every cluster side by side — health, topics, messages, consumer lag. Each cluster is fronted by its own small, stateless gateway (Kafka3O-Gateway) that owns the broker connection and credentials close to that cluster; the browser never talks to Kafka directly.

The console should be comfortable for dense technical data, easy to navigate, and explicit about connection problems and write outcomes. M6–M8 turn the existing functional pages into a consistent, accessible operator interface without changing the gateway API or the completed M1–M5 behavior. M9 extends the gateway and UI with explicitly confirmed Kafka configuration and partition administration. The next milestone, M10, adds local/Cognito login, global and per-cluster authorization, Production safeguards, and an attributable audit trail.

## Out of Scope
- A gateway serving more than one cluster
- The UI connecting to Kafka directly
- Cluster-wide broker default changes, ksqlDB administration, and Redpanda-specific management APIs
- Kafka ACLs/quotas, Kafka Connect, and Schema Registry administration in M10; these are deferred backlog candidates, not part of the authentication release
- Replaying, copying, or transforming messages between topics
- Persistence in the gateway (no database; stateless)
- Invented metrics or Gateway-to-Kafka connection-setting changes from the UI
- Direct SSO integrations other than Amazon Cognito in M10; additional providers are in the backlog

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
- **F25** User can inspect and change editable per-broker and topic Kafka configuration while sensitive and restart-required settings remain protected
- **F26** User can increase a topic's partitions and request manual replica placement while inspecting reassignment progress
- **F27** User can sign in with a local account or Amazon Cognito SSO and end or recover their Console session safely
- **F28** An authorized administrator can manage users, Cognito group mappings, and global/per-cluster role assignments
- **F29** User can access only permitted cluster resources and actions, with authorization enforced by the Gateway as well as the Console
- **F30** An authorized administrator can flag a cluster as Production, where only an ADMIN for that cluster can perform Kafka mutations
- **F31** An authorized user can inspect an attributable audit trail of authentication, access-control changes, denied actions, and Kafka mutation outcomes

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
- **Status:** Done
- **Features:** F23, F24
- **Goal:** Make consumer lag investigation and existing write operations understandable, contextual and explicit about safety and uncertain outcomes.
- **Phases:**
  - **P41** F23-B1 · Navigate cluster consumer-group summaries and details — Covers: F23-AC1 · Discovery: — · Status: Done
    - Demo: navigate from group summaries to exact partition-lag details and retry an incomplete group.
  - **P42** F23-B2 · Investigate topic-specific consumer groups — Covers: F23-AC2 · Discovery: — · Status: Done
    - Demo: inspect a topic's associated group and distinguish an unresolved association.
  - **P43** F24-B1 · Create topics with contextual feedback — Covers: F24-AC1 · Discovery: — · Status: Done
    - Demo: validate topic settings and inspect accepted and uncertain outcomes without repeating a pending request.
  - **P44** F24-B2 · Produce messages with contextual feedback — Covers: F24-AC2 · Discovery: — · Status: Done
    - Demo: submit a synthetic message with an optional key and header, then inspect its exact acknowledged position or an uncertain outcome.
  - **P45** F24-B3 · Request topic deletion with explicit consequences — Covers: F24-AC3 · Discovery: — · Status: Done
    - Demo: cancel a deletion, then confirm a synthetic request and distinguish acceptance from completed removal.

M6–M8 preserve existing routes, gateway contracts, exact offsets, bounded reads/searches and write safeguards. Each milestone must be served and verified at the EKS-D manual-test URL before it is marked Done; broker data and existing access endpoints must be preserved.

### M9 — Kafka configuration and partition administration
- **Status:** Done
- **Features:** F25, F26
- **Goal:** Offer explicitly confirmed per-resource Kafka configuration and partition operations without changing Gateway connection settings or silently retrying writes.
- **Phases:**
  - **P46** F25 + F26 · Gateway configuration and partition APIs, validation and uncertain outcomes — Status: Done
  - **P47** F25 + F26 · Broker/topic management views and confirmation flows — Status: Done
  - **P48** F25 + F26 · Regression, read-only EKS-D verification and manual deployment — Status: Done
    - Both persistent brokers passed metadata, configuration, reassignment-status, security and invalid Kafka validate-only checks; before/after checks confirmed no configuration or partition change. Browser checks covered navigation, cancellation, focus and responsive layout.
    - The persistent clusters have one broker each. Successful live writes and multi-broker placement remain unverified and require a separately approved test fixture.

### M10 — Authenticated, authorized and auditable cluster operations
- **Status:** Active — the deployed M9 shared-token/manual-test behavior remains unchanged until the secured deployment is verified.
- **Features:** F27, F28, F29, F30, F31
- **Goal:** Give each operator an identity and explicit access, enforce Production protection at the Gateway, and record who attempted or performed each sensitive operation.
- **Approved direction (2026-11-06):**
  - Local username/password login and Amazon Cognito User Pool SSO first. Other direct identity-provider integrations remain in F42.
  - Add one central Console backend for login, secure server-side sessions, access management, cluster classification and audit persistence. Keep one stateless Gateway per Kafka cluster; the backend does not move Kafka credentials into the browser.
  - Use a dedicated durable SQLite volume and one Console instance. A separate test-only database/volume may be created on `eksd-01`; Kafka volumes are not reused.
  - Support both global and per-cluster `VIEWER`, `OPERATOR`, and `ADMIN` grants. Global grants apply to all registered clusters; cluster grants add access only to their cluster. No grant means no access; grants combine by highest role, with no implicit deny/override model in this release.
  - `VIEWER` can read permitted clusters; `OPERATOR` can perform supported Kafka writes on non-Production clusters; `ADMIN` can also write on Production. A global ADMIN can administer Console identities/policy; a cluster ADMIN cannot grant global access or downgrade its cluster's Production flag.
  - The extra ADMIN-only mutation guard applies **only to Production**. Non-Production writes still require the normal action permission; this does not make every authenticated user a writer.
  - Production covers every Kafka mutation: produce, topic creation/deletion, broker/topic configuration changes, partition increases and replica reassignment. ADMIN operations still require the existing validation/confirmation plus a recorded Production change reason.
  - Gateways authorize the actual request against current server-owned policy, including direct API calls. Shared-token access and the automatic manual-test proxy must not bypass M10 policy.
  - Persist authentication/security events, policy changes, denials, mutation intent and the accepted/rejected/unknown outcome. Provide a permission-scoped audit page with filters and export; exclude credentials, payloads and sensitive configuration values.
- **Phases:** Existing M9 access stays in place until the complete secured path is ready; unfinished phases do not imply enforcement is deployed.
  - **P49** F28-B2 + F30-B2 · Additive role resolution and Production mutation policy — Covers: F28-AC2, F30-AC3 · Discovery: — · Status: Done
    - Demo: policy tests cover global/cluster grants and VIEWER/OPERATOR/ADMIN across both environments and missing classification.
    - Review: role/action/Production matrix, race detector, vet and Gateway regression tests passed. This is a standalone policy package; it does not enforce access in the running deployment until P55.
  - **P50** F31-B1 · Durable single-instance SQLite storage and audit foundation — Covers: storage foundation of F31-AC4 · Discovery: SQLite durability and backup · Status: Done
    - Demo: migrate, persist and reopen a dedicated database without exposing credential or payload data.
    - Storage migration, scoped event queries and snapshot/restore tests passed locally and in isolated EKS-D temporary files. Audit integration, deployed-volume backup/retention and end-to-end redaction remain outstanding.
  - **P51** F27-B1 + F27-B4 · Bootstrap and local account login — Covers: F27-AC1, F27-AC4 · Discovery: — · Status: Done
    - Demo: bootstrap one administrator, authenticate an enabled local user and reject invalid/disabled accounts.
    - The tested local-authentication foundation provides one-use bootstrap, salted Argon2id passwords, durable login and bootstrap throttling, password replacement, and redacted success/denial audit events. An offline pipe-only bootstrap command and loopback-only HTTPS session process are available but not deployed. Account disablement and administrator password reset revoke sessions and audit changes; reset has durable throttling and requires a further password change. Administrator-only account creation provisions role-free users with temporary passwords. Creation, reset and account-state changes are exposed only through the session- and CSRF-checked loopback Console API. The opt-in authentication-only preview's built bundle has passed a real, verified same-origin HTTPS fixture against the Console API, with simulated DOM/cookies and no Gateway requests. Native-browser TLS/cookie validation, deployment, recovery and complete end-to-end integration remain outstanding.
  - **P52** F27-B3 + F29-B3 · Session expiration, logout and revocation — Covers: local Console portions of F27-AC3, F29-AC4 and revocation audit of F27-AC4 · Discovery: — · Status: Done
    - Demo: logout or revoke a session and verify its next protected request is rejected without replay.
    - Tested primitives and a loopback-only HTTPS session process cover opaque session/CSRF tokens, idle and absolute expiry, logout, and atomic revocation on password change, administrator reset, or account-state change. Audited local global-ADMIN session listing and single-session revocation are exposed on the undeployed loopback HTTPS API. A separately authenticated administrator revokes the built preview's session in the verified-HTTPS fixture; its next request receives 401 and the UI clears signed-in state without replay or legacy Gateway requests. Native-browser TLS/cookie validation and deployment are not verified. Protected Kafka routes, secured-UI cache clearing and Gateway-side revocation remain P55/P59, and Cognito logout remains P53.
  - **P53** F27-B2 · Amazon Cognito sign-in and group refresh — Covers: F27-AC2 · Discovery: [Cognito fixture](./discovery/cognito-user-pool-fixture.md), [browser marker protocol](./discovery/browser-marker-protocol.md); a test User Pool is available · Status: Done
    - Demo: complete the documented flow against a controlled Cognito-compatible fixture and reject forged, expired, wrong-client and replayed callbacks. Real Cognito testing is deferred until a user pool is available.
    - Synthetic verified-TLS tests cover ID-token verification, one-shot code exchange, audited role-free Cognito session creation and one-shot provider refresh with atomically persisted encrypted retained or rotated tokens. An opt-in session manager coalesces and bounds refresh work; durable per-generation reservations block replay across managers and restarts. Uncertain sessions keep their cookies and the authentication preview offers explicit local sign-out. The undeployed Console periodically cleans inactive Cognito credentials and browser bindings in audited bounded batches, atomically retiring old sessions and removing retained credentials without deleting active mappings. An initially empty, issuer-bound group-mapping foundation resolves current verified groups alongside direct roles without exposing claims. Browser authorization URL, transient-cookie, strict callback-parsing and stable-marker generation/parsing helpers are implemented without exposing a route. Unused trusted-marker session primitives serialize local/Cognito issuance and recheck current bindings for session use, grants, audited logout, local administrator actions and one-shot provider refresh; the opt-in manager coordinates bound refreshes by session and marker and revalidates each waiter. Replacing an inactive browser session atomically revokes it, removes its provider credential and audits retirement. Bound authorization attempts, code exchanges and session proofs carry the same private marker digest, but marker initialization/lifecycle, browser login, Cognito identity-disable administration, audited mapping administration, deployed storage/backup retention and secured deployment remain unfinished.
  - **P54** F28-B1 + F28-B3 · Audited access-administration API — Covers: F28-AC1, F28-AC3, server portion of F28-AC4 · Discovery: — · Status: Done
    - Demo: global ADMIN changes scoped grants and Cognito group mappings with before/after audit; cluster ADMIN and self-changes are denied; stale and last-admin changes conflict.
    - Audited grant, group-mapping and access-listing routes are on the undeployed loopback Console for local global ADMINs, with per-request grant resolution, optimistic conflicts, self-change denial and redacted before/after audit. UI, classification and deployment remain P60/P61/P59.
  - **P60** F30-B1 · Registered clusters and Production classification — Covers: F30-AC1 · Discovery: — · Status: Done
    - Demo: migration registers existing clusters unclassified; global ADMIN classifies one with confirmation and reason; cluster ADMIN, browser config and spoofed input cannot change it; unclassified blocks writes.
  - **P61** F28-B1 + F28-B3 + F30-B1 · Access-management and classification UI — Covers: UI portion of F28-AC4, additive-model explanation of F28-AC2, F30-B1 display · Discovery: — · Status: Done
    - Demo: global ADMIN manages grants, mappings and classification with confirmation naming subject and scope; cancel sends nothing; 401/403/409/503 are distinct.
  - **P55** F29-B1 + F29-B2 + F30-B2 · Console policy API and Gateway secured-mode enforcement — Covers: F29-AC1, F29-AC2, F30-AC2 · Discovery: [gateway-service-trust](./discovery/gateway-service-trust.md) · Status: Done
    - Demo: direct, forged, replayed or wrong-cluster Gateway requests and non-ADMIN Production writes are denied before Kafka; only Console mTLS with a current delegation reaches Kafka.
  - **P62** F29-B1 + F29-B3 · Console request forwarding and secured UI path — Covers: F29-AC3, F29-AC4 · Discovery: [gateway-service-trust](./discovery/gateway-service-trust.md) · Status: Done
    - Demo: the secured UI reads and writes through the Console with local and Cognito identities enforced identically; policy outage shows unavailability, revocation applies on the next request.
  - **P56** F30-B3 · Production-aware confirmation and reason — Covers: F30-AC4 · Discovery: — · Status: Done
    - Demo: an ADMIN confirms an allowed Production mutation with a reason; canceling or omitting the reason sends no write.
  - **P57** F31-B1 + F31-B3 · Correlated security and mutation audit — Covers: F31-AC1, F31-AC2, F31-AC5 · Discovery: — · Status: Done
    - Demo: audit denial and durable intent/outcome; persistence failure prevents dispatch or reports an uncertain outcome.
  - **P58** F31-B2 · Permission-scoped audit investigation — Covers: F31-AC3 · Discovery: — · Status: Done
    - Demo: cluster ADMIN filters/exports only its cluster's audit; global security events remain inaccessible.
  - **P59** F27–F31 · End-to-end regression, migration and secure manual deployment — Covers: release integration of F27–F31 · Discovery: EKS-D HTTPS/cutover · Status: Defined
    - Demo: preserve the existing Kafka data while verifying secured browser, Console, Gateway, policy and audit paths.
- **Completion evidence:** Local login and Cognito-compatible fixture tests; global/cluster role and Production/non-Production matrices; direct-Gateway bypass and revocation tests; audit-failure/unknown-write tests; persistent identity/audit restart checks; migration and rollback exercise on the manual EKS-D deployment. Mutation tests use separately approved synthetic fixtures, not existing persistent topic data. Real Cognito login remains unverified until a User Pool is available and must be checked before relying on SSO in production.
- **Discovery before completion:** Cognito user pool/app client, callback/logout URLs and group claims; SQLite backup/retention procedure and exact supported dependency versions; authenticated Console-to-Gateway delegation and policy API; legacy-token/manual-proxy cutover.
- **Contracts:** Detailed behaviors and acceptance criteria are in [FUNC-SPEC.md](./FUNC-SPEC.md#f27--local-and-cognito-sign-in-planned-m10); the Gateway trust flow and migration are in [TECH-SPEC.md](./TECH-SPEC.md#m10-identity-authorization-and-audit-planned).

## Backlog
M10 is next. The following items are candidates after M10, not commitments to implement every Redpanda feature. All future writes must use F29/F30 authorization and F31 audit; no candidate silently expands the current bounded reads or changes Kafka connection credentials.

- **F15 · High:** User can reset a consumer group's offsets to earliest, latest or a timestamp, with a preview and inactive-group checks.
- **F16 · High:** User can decode Avro/Protobuf values via a Schema Registry.
- **F17 · Deferred:** User can add or remove registered Gateway endpoints from an authorized Console page instead of a config file; this does not edit a Gateway's Kafka connection settings.
- **F32 · High:** User can browse Schema Registry subjects, versions and references, check compatibility, and explicitly register or delete schema versions.
- **F33 · High:** An authorized user can inspect/manage Kafka ACLs and supported broker principals/credentials; Kafka permissions remain distinct from Console roles.
- **F34 · Medium:** An authorized user can delete inactive consumer groups or selected committed offsets, separately from F15 offset resets.
- **F35 · Medium:** User can inspect configured Kafka Connect clusters/connectors and explicitly create, update, pause, resume, restart or delete supported connectors/tasks.
- **F36 · Medium:** User can filter records by headers/decoded fields and, if justified, sandboxed expressions with CPU/time/scan limits; no unbounded JavaScript execution in a Gateway.
- **F37 · Medium:** User can continue message browsing with exact-offset cursors and explicit page/session budgets instead of only a single bounded result window.
- **F38 · Medium:** User can inspect raw bytes in hex, download individual record bytes, and select additional supported key/value/header codecs; complements F16 rather than duplicating schema lifecycle.
- **F39 · Deferred:** An ADMIN can request supported record-range deletion with a precise offset preview and audit; Kafka truncation is not arbitrary deletion of one selected record.
- **F40 · Medium:** User can view sanitized topic documentation and ownership/runbook links, optionally synchronized from an explicitly configured Git repository.
- **F41 · Deferred:** User can inspect genuine broker/partition health diagnostics and available metrics, with explicit unavailable states and a separately configured metrics source.
- **F42 · Deferred:** User can sign in through additional directly integrated OIDC providers, starting with Keycloak, Authentik, Microsoft Entra ID, Okta and Google Workspace; Cognito federation is not a claim that these integrations have been tested.
- **F43 · Deferred:** Deployments with compatible brokers can optionally propagate end-user identity to Kafka/upstream APIs instead of a shared service principal; this is not required for Cognito login or M10 application auditing.
- **F44 · Deferred:** An authorized user can inspect client quotas and, after Kafka API discovery, explicitly change supported quotas.

### Redpanda Console comparison (checked 2026-11-06)
Compared current official Redpanda documentation (pages identify Console v3.14.0) with the Kafka3O specs and registered Gateway routes. This is a documented-behavior comparison, not a feature-by-feature execution test or a licensing guarantee. Authentication/RBAC are enterprise features in the referenced Redpanda documentation; Redpanda broker audit logging is also enterprise and must not be presented as generic Kafka or Console application auditing.

| Documented Redpanda behavior | Kafka3O today / gap | Roadmap mapping |
| --- | --- | --- |
| Topic/broker inspection, configuration, produce/create/delete, consumer lag | Already covered by M1–M9; no duplicate backlog feature | F1–F14, F25–F26 |
| OIDC/basic sign-in and Console roles [R2, R3] | Only shared Gateway tokens/local test proxy; no user identity or authorization | M10: F27–F30; other SSO: F42 |
| API identity forwarding; Redpanda broker audit events [R2, R10] | Kafka3O needs its own user-attributed audit even while Kafka sees a Gateway service account | M10: F31; optional upstream identity: F43 |
| Consumer offset reset and group/offset management [R1, R3] | Inspection exists; offset and group mutation do not | F15, F34 |
| Schema-backed decoding and schema lifecycle/compatibility [R4, R5] | Text/JSON/base64 only; no Schema Registry integration | F16, F32 |
| ACLs, principals/credential rotation and quota visibility [R1, R3] | No corresponding UI/Gateway APIs | F33, F44 |
| Kafka Connect lifecycle [R6] | No Connect integration; Redpanda documents it as community-supported | F35 |
| Programmable record filters and continuous pagination [R7, R8] | Bounded substring search and bounded reads exist; no structured scripting/pagination workflow | F36, F37 |
| Additional deserializers, hex inspection and raw-byte download [R5] | No codec selection beyond text/JSON/base64 or binary download workflow | F38 |
| Record deletion [R3] | Topic deletion exists, record-range deletion does not | F39 |
| Git-backed topic documentation [R9] | No documentation tab/source | F40 |
| Broader broker/partition health monitoring [R1] | Metadata/lag are available, not a metrics/diagnostics integration | F41 |
| Production flag and ADMIN-only Production mutations | Kafka3O user requirement; not asserted as Redpanda parity | M10: F30 |

**Sources:** [R1 Console overview](https://docs.redpanda.com/current/console/); [R2 Authentication](https://docs.redpanda.com/current/console/config/security/authentication/); [R3 Authorization and role capabilities](https://docs.redpanda.com/current/console/config/security/authorization/); [R4 Schema Registry](https://docs.redpanda.com/current/console/ui/schema-reg/); [R5 Record deserialization](https://docs.redpanda.com/current/console/ui/record-deserialization/); [R6 Kafka Connect](https://docs.redpanda.com/current/console/config/kafka-connect/); [R7 JavaScript filters](https://docs.redpanda.com/current/console/ui/programmable-push-filters/); [R8 Pagination](https://docs.redpanda.com/current/console/ui/paginate-messages-events/); [R9 Topic documentation](https://docs.redpanda.com/current/console/config/topic-documentation/); [R10 Redpanda broker audit logging](https://docs.redpanda.com/current/manage/audit-logging/).

Redpanda-only Shadow Links, its Admin API, and Redpanda-specific diagnostic operations are not promised for generic Kafka. Replay/copy workflows and live tailing are not added to scope by this comparison.

### Existing verification debt
- **Verification debt:** Run the Docker-only stopped-broker test and P14 browser demo, and verify the remaining cross-cluster and consumer-group browser demos.
- **Verification debt:** Repeat the P24–P27 browser smoke test with a trusted deployment certificate and complete the producer key/header browser demo.
- **Verification debt:** Run the built gateway container in a deployment; the image was built and scanned on EKS-D but was not started as a container.
- **Verification debt:** Repeat M7/M8 exact-record and consumer-detail browser demos with trusted Gateway certificates when test records and consumer groups are available; real write demos require scoped synthetic data.
- **Verification debt:** Verify successful configuration/partition writes and multi-broker reassignment on a separately approved fixture; the persistent EKS-D checks intentionally do not apply changes.
- **Verification debt:** Run the Cognito sign-in, group refresh and logout integration against a real User Pool when an AWS account and app client become available; fixture tests are not evidence of live provider compatibility.

## Learnings
- 2026-11-08 (P57 review): A Gateway holds a mutation's response until its outcome is recorded, so an audit outage after Kafka accepted a write surfaces as an explicit unknown with an operation ID rather than an unattributed success.
- 2026-11-08 (P62 review): The secured UI treats the Console forwarding base as each cluster's "Gateway URL", so the existing pages work unchanged while tokens and Gateway addresses never reach the browser. Never chain a commit after a long test run in one command: killing a stalled run let the commit proceed unverified.
- 2026-11-08 (P55 review): Secured Gateways accept only the Console over mTLS with a single-use, request-bound delegation consumed at the Console; every bypass in the matrix was denied before Kafka, locally and on EKS-D. Liveness needs optional client certificates on the same listener.
- 2026-11-08 (P61 review): The preview shows administration to every signed-in session and lets the Console decide; tests that revoke sessions must wait for those reads, because a concurrent 401 correctly ends the session.
- 2026-11-08 (P60 review): Cluster classification now lives only in the Console store, seeded unclassified from an operator file; deactivation keeps a classification, but retargeting an ID to another Gateway is refused rather than inherited.
- 2026-11-08 (P54 review): Forbidding self-changes keeps the acting local global ADMIN in place, so grant administration cannot remove the last one; this replaces a separate last-admin check.
- 2026-11-08 (P53 review): The synthetic-provider Cognito demo passed locally and in a disposable EKS-D pod without touching the test clusters; live Cognito, native-browser cookies and secured deployment remain unverified until P59.
- 2026-11-06 (P52 review): A separate authenticated administrator can revoke the preview's session; the next Console request receives 401 and the preview clears its signed-in state without replay. This does not yet verify Gateway enforcement, secured caches, native-browser cookies or deployment.
- 2026-11-06 (P51 review): A generated test CA and a verified Node HTTPS client exercise the built local-login preview against the real Console API without modifying machine trust; jsdom does not prove native-browser TLS or cookie behavior.
- 2026-11-06 (M10 planning): User selected a central Console backend, Cognito first plus local login, global and per-cluster roles, and an ADMIN-only Kafka mutation guard only on Production clusters. Existing bearer tokens do not establish user identity; enforcement and attributable audit must extend to the Gateway, not just disabled UI controls. This is a planned architecture change, not a deployment or completed security feature.
- 2026-11-06 (M10 execution): The user does not yet have an AWS account and approved continuing without a live Cognito test. Use controlled provider fixtures and keep live Cognito compatibility explicitly unverified.
- 2026-11-06 (M9): Kafka reports `auto.create.topics.enable` as read-only; both live brokers exposed editable dynamic settings while protecting sensitive values. Their single-broker topology cannot verify replicated placement.
- 2026-11-06 (M9): A configuration editor must remain visible and restore keyboard focus even when selected from hundreds of broker settings. Unknown writes require a fresh read, not an automatic retry.
- 2026-11-06 (M8 retro): P41–P45 cover F23–F24 with accessible consumer-summary navigation and contextual create, produce and delete workflows.
- 2026-11-06 (M8 retro): Fixture-driven demos exercised validation, pending guards, uncertain writes, cancellation and exact offsets without modifying persistent Kafka data.
- 2026-11-06 (M8 retro): Both live consumer-group reads succeeded but returned no groups, so live group-detail and exact-record demos remain outstanding.
- 2026-11-06 (M8 retro): The final EKS-D rollout retained the previous UI ConfigMap and healthy brokers; its test certificates and tokens rotated and the tunnel was restored.
- 2026-11-06 (M8 retro): Both npm audits had zero findings; Node itself remains pending a runtime vulnerability scan.
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
