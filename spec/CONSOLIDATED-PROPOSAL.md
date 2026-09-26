# Kafka3O-UI Consolidated Contract Proposal

Revision: ~~0.5~~ **[NEW]** 0.6 | Date: ~~2026-09-25~~ **[NEW]** 2026-09-26 | Decision status: **[NEW]** APPROVED REDUCED-V1 CONTRACT ADDENDUM; PIPELINE STEP 8 REVIEW PENDING

Baselines: [FUNC-SPEC.md](FUNC-SPEC.md) revision 0.4, [TECH-SPEC.md](TECH-SPEC.md) revision 0.11, [DESIGN-SPEC.md](DESIGN-SPEC.md) revision 0.6.

**[NEW] Current release precedence:** The baseline line above records original proposal history. Section 11 records the approved reduced-v1 scope and controls all earlier all-operation, replay, continuation, permission-count, and B1/B2 handoff statements in this addendum. Current baselines are FUNC-SPEC 0.6 and TECH-SPEC 0.16. V1 has 40 active command IDs / 46 operations / 49 permission literals; the unchanged Gateway source catalog remains 41 / 47. Section 8's unresolved contracts are deferred-feature work, not active v1 requirements or proven solutions. No pipeline Step 8 READY or release clearance is granted.

~~This is the consolidated proposal authorized by the user's "use recommended" decision. It is not an amendment to the approved specifications, a Step 8 audit sign-off, or permission to create tasks. New fields, algorithms, limits, and commands below are PROPOSED.~~ **[NEW]** The user approved this decision package on 2026-09-25. P1-P6 and their contracts in sections 2-6 are adopted as a normative addendum through TECH-SPEC section 12. Section 7 records historical evidence; P7 retains section 8's B1/B2 blockers and authorizes further investigation, not the unproven adapter design. Section 9 remains mandatory acceptance and handoff criteria. Original "proposed" labels below identify the approved proposal's wording and do not leave P1-P6 awaiting approval. Existing approved constraints remain binding. Design status remains **BLOCKED**; release verification remains **PENDING**. Gateway changes and a continuation API extension are not authorized. No feature has been removed. This approval is not Step 8 sign-off, approval of the entire visual-design draft, or permission to create tasks.

## 1. Decision Package

**[NEW]** Subsequent approval on 2026-09-25 adopts the B1/B2 recommendations and starting limits in section 8.1, incorporated through TECH-SPEC section 12.4. It supersedes earlier pending-direction statements only for those explicit choices. It does not approve a complete continuation algorithm/API or close the compatibility blockers.

**[NEW]** The next approval on 2026-09-25 adopts the six workflow recommendations in section 8.3 through TECH-SPEC section 12.5. Section 8.4 identifies the remaining exact contracts and proof requirements; the earlier pending lists are historical where superseded by these explicit selections.

**[NEW]** The subsequent approval on 2026-09-25 adopts the six item-1 contract recommendations in section 8.5 through TECH-SPEC section 12.6. Section 8.6 identifies still-unselected details and proof requirements. Earlier pending statements are superseded only for these explicit decisions, not an unpresented complete DTO or adapter algorithm.

| Decision | Recommendation | Approval effect |
|---|---|---|
| P1 | Bind all 47 explicit operations to the pinned Gateway contracts using section 2 | Complete the operation/tier/permission/audit inventory without introducing a proxy |
| P2 | Adopt the application DTOs, safe numeric transport, and error catalog in section 3 | Complete application-owned API contracts, except the explicitly blocked continuation contract |
| P3 | Adopt the provider schemas and atomic operations in section 4 | Select exact normalization, constraints, concurrency, and persistent throttle behavior |
| P4 | Adopt bounded exports, deadlines, admission, and health behavior in section 5 | Select operational limits; benchmarks remain release evidence |
| P5 | Adopt the maintenance and reconciliation commands in section 6 | Select executable recovery procedures and their fail-closed gates |
| P6 | Adopt empty-confirm previews only on the tested confirmation-bearing routes in section 7 | Resolve the initial-preview wire-shape question for the pinned Gateway revision |
| P7 | Retain latest-mode and multi-partition compatibility as blockers under section 8 | Authorize further adapter proof, not a claim that the adapter is correct |

~~Approval may cover P1-P6 together while retaining P7's blockers.~~ **[NEW]** Approval covers P1-P6 together and P7's retention of the compatibility blockers. TECH-SPEC section 12 incorporates this revision by reference as its normative contract addendum; FUNC-SPEC records its behavioral refinements. Do not interpret approval of this document as READY. The complete specification still requires the separate full Step 8 review and user sign-off after the compatibility design is resolved. Pending implementation tests/scans alone are release gates, not substitutes for the unresolved design decisions below.

## 2. Gateway Contract Bindings

### 2.1 Pinned Source and Common Rules

Gateway revision tested: `91b7a24cda1ef10b6541ed96efb6b170f974e121`.

Contract source: the revision's checked-in `internal/api/testdata/openapi.golden.json`; SHA-256 `9326149125E05A2D30AECE7E4E4A6612631AF61770BEB4DB685B40CE9F86113A`. This is a source snapshot, not a captured production schema. Pin a reviewed copy in the future UI contract-test fixtures; verify the served schema and artifact before release. Do not fetch arbitrary `$ref` URLs at runtime.

Each table row inherits its referenced schema recursively: required/optional fields, nullability, enums, nested DTOs, bounds, and path/query/header parameters from that operation. This precise reference avoids a second, drifting transcription. Requests reject unknown fields. Allowed map keys remain maps, not arbitrary operation destinations. UI transport applies section 3.1; Gateway transport retains the original numeric types. Strip only the generated `$schema` documentation annotation from UI DTOs. Preserve all business fields, error details that can be safely exposed, record encodings, null markers, and repeated-header order.

Map `/v1/<suffix>` to `/api/v1/clusters/{clusterId}/<suffix>` with the same method, using explicit endpoint registration. Encode resource identifiers once as path segments; resolve the base URL and credentials solely from configuration; reject redirects to avoid credential leakage. Every **[NEW]** active row requires exactly its listed literal permission. The permissions catalog also includes `app.access.manage`, `app.audit.view`, and `gateway.lock.override`: ~~50 literals total~~ **[NEW]** 49 v1 literals total, excluding deferred `gateway.m8`, with no wildcard or implicit command-parent grant.

Tier R uses the configured reader credential; W uses the operator credential, including S1/S2 listing. Do not infer tier from GET/POST. Kinds: R = inspection, W = mutation without confirmation, D = confirmation-bearing destructive mutation. D previews still require the row's permission and operator tier. M1-M8 remain subject to Gateway's data-plane lock; an override additionally requires explicit `gateway.lock.override` permission and a reason on that single request.

Audit profiles: A = ordinary inspection (durable pre-action and result auditing when emergency identity or override applies); B = durable ATTEMPT then RESULT for mutation; C = B for execution plus durable pre-action and result auditing for destructive preview. Authentication events and denials are audited separately. No audit profile waives Gateway auditing. A required pre-action write failure prevents forwarding; post-result write failure preserves the business result and exposes `recording_failed`.

### 2.2 Complete Operation Matrix

`-` means no JSON request body. M5/M6 custom bodies are specified in section 2.3. Request and response names below refer to `components.schemas` in the pinned document. The response column is the success payload, not a claim that only HTTP 200 is possible.

| Permission | Method | Gateway path | Tier | Kind | Audit | Request schema | Success schema |
|---|---|---|---|---|---|---|---|
| gateway.c1 | GET | /v1/cluster | R | R | A | - | DescribeClusterBody |
| gateway.c2 | GET | /v1/cluster/brokers/{brokerId}/config | R | R | A | - | DescribeBrokerConfigBody |
| gateway.c3.live | GET | /v1/health/live | R | R | A | - | LiveBody |
| gateway.c3.ready | GET | /v1/health/ready | R | R | A | - | ReadyBody |
| gateway.c4 | GET | /v1/cluster/health | R | R | A | - | ClusterHealthBody |
| gateway.c5 | PATCH | /v1/cluster/brokers/{brokerId}/config | W | D | C | AlterBrokerConfigRequestBody | AlterBrokerConfigBody |
| gateway.c6 | GET | /v1/cluster/quorum | R | R | A | - | QuorumBody |
| gateway.c7 | GET | /v1/cluster/reassignments | R | R | A | - | ListReassignmentsBody |
| gateway.c8 | GET | /v1/cluster/log-dirs | R | R | A | - | LogDirsBody |
| gateway.c9.start | POST | /v1/cluster/reassignments | W | D | C | ReassignRequestBody | ReassignBody |
| gateway.c9.cancel | POST | /v1/cluster/reassignments/cancel | W | D | C | CancelReassignmentsRequestBody | ReassignBody |
| gateway.c9.elect | POST | /v1/cluster/elections | W | D | C | ElectionsRequestBody | ElectionsBody |
| gateway.c10 | GET | /v1/cluster/throughput | R | R | A | - | ThroughputBody |
| gateway.c11 | GET | /v1/cluster/export | R | R | A | - | ExportBody |
| gateway.c12 | POST | /v1/batch/topics/apply | W | D | C | ApplyTopicsRequestBody | ApplyTopicsBody |
| gateway.t1 | GET | /v1/topics | R | R | A | - | ListTopicsBody |
| gateway.t2 | GET | /v1/topics/{name} | R | R | A | - | DescribeTopicBody |
| gateway.t3 | GET | /v1/topics/{name}/size | R | R | A | - | TopicSizeBody |
| gateway.t4 | GET | /v1/topics/{name}/count | R | R | A | - | TopicCountBody |
| gateway.t5 | POST | /v1/topics | W | W | B | CreateTopicRequestBody | CreateTopicBody |
| gateway.t6 | POST | /v1/batch/topics | W | W | B | CreateTopicsBulkRequestBody | CreateTopicsBulkBody |
| gateway.t7 | DELETE | /v1/topics/{name} | W | D | C | DeleteTopicRequestBody | DeleteTopicBody |
| gateway.t8 | POST | /v1/batch/topics/delete | W | D | C | BulkDeleteRequestBody | BulkDeleteBody |
| gateway.t9 | PATCH | /v1/topics/{name}/config | W | D | C | AlterConfigRequestBody | AlterConfigBody |
| gateway.t10 | POST | /v1/topics/{name}/partitions | W | D | C | AddPartitionsRequestBody | AddPartitionsBody |
| gateway.t11 | POST | /v1/topics/{name}/delete-records | W | D | C | DeleteRecordsRequestBody | DeleteRecordsBody |
| gateway.t12 | POST | /v1/topics/{name}/purge | W | D | C | PurgeRequestBody | PurgeBody |
| gateway.m1 | GET | /v1/topics/{name}/messages | R | R | A | - | ReadMessagesBody |
| gateway.m2 | GET | /v1/topics/{name}/partitions/{partition}/messages/{offset} | R | R | A | - | RecordDTO |
| gateway.m3 | POST | /v1/topics/{name}/messages/search | R | R | A | SearchBody | ReadMessagesBody |
| gateway.m4 | POST | /v1/topics/{name}/messages/filter | R | R | A | FilterBody | ReadMessagesBody |
| gateway.m5 | POST | /v1/topics/{name}/messages | W | W | B | ProduceItemOrArray | ProduceResponseBody |
| gateway.m6 | POST | /v1/topics/{name}/messages/bulk | W | W | B | ProduceUpload | ProduceResponseBody |
| gateway.m7 | POST | /v1/topics/{name}/tombstones | W | W | B | TombstoneItem | TombstoneResponseBody |
| ~~gateway.m8~~ **[NEW]** DEFERRED: gateway.m8 | POST | /v1/replays | W | D | C | ReplayRequestBody | ReplayResponseBody |
| gateway.g1 | GET | /v1/consumer-groups | R | R | A | - | ListGroupsBody |
| gateway.g2 | GET | /v1/consumer-groups/{groupId} | R | R | A | - | DescribeGroupBody |
| gateway.g3 | GET | /v1/topics/{name}/consumer-groups | R | R | A | - | TopicConsumerGroupsBody |
| gateway.g4 | POST | /v1/consumer-groups/{groupId}/reset-offsets | W | D | C | ResetOffsetsRequestBody | ResetOffsetsBody |
| gateway.g5 | DELETE | /v1/consumer-groups/{groupId} | W | D | C | DeleteGroupRequestBody | DeleteGroupBody |
| gateway.g6 | POST | /v1/consumer-groups/{groupId}/remove-members | W | D | C | RemoveMembersRequestBody | RemoveMembersBody |
| gateway.g7 | POST | /v1/consumer-groups/{target}/clone-offsets | W | D | C | CloneOffsetsRequestBody | CloneOffsetsBody |
| gateway.s1.list | GET | /v1/scram-users | W | R | A | - | ListUsersBody |
| gateway.s1.create | POST | /v1/scram-users | W | W | B | CreateUserRequestBody | CreateUserBody |
| gateway.s1.delete | DELETE | /v1/scram-users/{name} | W | D | C | DeleteUserRequestBody | DeleteUserBody |
| gateway.s2.list | GET | /v1/quotas | W | R | A | - | ListQuotasBody |
| gateway.s2.alter | PATCH | /v1/quotas | W | D | C | AlterQuotaRequestBody | AlterQuotaBody |

Preserve actual 201 create and 207 per-item responses, not just the snapshot's declared 200 schemas. The checked-in snapshot under-describes these statuses and M5's body; executable route fixtures must supplement it. Success wraps the payload in the approved `{data,meta}` envelope, except the C11 download. Never convert a mixed result into all-success. Ordinary Gateway errors retain their safe code in `upstreamCode` and use section 3.4. Preview/execute are separate requests and separately authorized; no preview grants future execution.

**[NEW]** This matrix retains 47 Gateway source rows for traceability, but v1 registers only the 46 active rows. The deferred M8 row has no UI endpoint or active permission. M1/M3/M4 inherit section 11's narrower selection contract. There are 17 active D rows; the historical 18-route preview evidence includes deferred M8 and is not a claim of 18 v1 preview operations.

### 2.3 Message and Preview Exceptions

M5 `ProduceItemOrArray` accepts one item or a nonempty array. Item fields: `value` required string; optional `key` string, `keyEncoding`/`valueEncoding` string, `partition` int32, `timestampMs` decimal-string int64, and ordered `headers` array. Each header has required `key` and `value` strings and optional `valueEncoding`. Encoding is `string`, `json`, or `base64`; omitted/empty encoding defaults to string. String/json carry the supplied text bytes unchanged; json does not imply parsing or reformatting a message. Base64 uses the standard alphabet and validated decoding. An omitted key becomes the Gateway's empty key, never a fabricated null key.

M6 `ProduceUpload` accepts `application/json` containing one JSON array or `application/x-ndjson` containing one item per nonblank line. Blank NDJSON lines are ignored, nonblank line order is retained, and invalid lines reject the entire upload before forwarding. Missing Content-Type follows Gateway's JSON-array default; a valid media-type parameter such as charset is allowed, other media types return415. The browser always sends an explicit type. Validate every item before mutation and preserve each item's index. Uploaded files are parsed losslessly on the backend, including raw numeric timestampMs tokens in existing Gateway-format files; browser code never parses them through a JavaScript number. The snapshot's binary placeholder is not a complete schema. These rules are grounded in the pinned bulk handler/service and encoder; implementation fixtures must still exercise both formats, exact numeric conversion, and invalid records.

M7 uses the exact `TombstoneItem` schema: it has no value field and writes a null value. Do not represent a tombstone as an empty string. Null/empty/encoded record data and nullable header collections must survive round trips; do not invent message content from presentation placeholders. Passwords in S1.create remain write-only and outside audit/log/result snapshots.

For the 18 D rows, the first preview sends `dryRun=true` and an explicit `confirm:""`, plus all other valid inputs. Execution sends the exact target or plan token selected by the Gateway contract. Rebuild preview after input changes. Never send an empty execution confirmation or manufacture a plan token. T5/T6/S1.create are not in this confirmation-bearing set; expose supported preview behavior only where the pinned handler actually implements it. Their audit profile remains B.

## 3. Application API Contracts

### 3.1 Common Types and Transport

All application JSON is UTF-8, camelCase, with unknown request properties rejected. Required fields cannot be null unless explicitly marked `?`. Response fields are present, using null for specified nullable values. Request IDs are server-generated UUIDs for application operations; Gateway correlation values are validated against its existing limits and propagated. Ignore untrusted identity/credential headers. Errors never echo submitted secrets or raw upstream bodies.

`Id` and `Revision` are lowercase hyphenated UUID strings. `Instant` is UTC RFC3339 with exactly three fractional digits and `Z`. `Int64String` matches `0|-?[1-9][0-9]*`, range checked as signed int64; fields requiring nonnegative values reject negatives. All inherited int64 values, including nested map values, cross the browser boundary as decimal strings. Int32 values remain JSON integers. Generic JSON numbers from Gateway must be parsed losslessly, never through `double`; arbitrary numeric content inside a message stays message content. Requests convert only schema-designated fields back to Gateway numbers. Missing, null, zero, empty string, and an omitted optional field are not interchangeable.

Common `meta={requestId:string,auditStatus:recorded|recording_failed|not_required}`. `Page<T>={items:T[],page:{number:int32,size:int32,total:Int64String}}`; approved pageNumber/pageSize defaults and ordering apply. `Principal={authSource:entra|cognito|emergency,issuer:string?,subject:string,displayName:string?,email:string?}`; no raw claims or tokens are returned. Presentation identity fields never authorize. `SessionView={principal:Principal,createdAt:Instant,lastActivityAt:Instant,idleExpiresAt:Instant,absoluteExpiresAt:Instant,applicationPermissionIds:string[]}`. Cluster-scoped permissions appear only in `ClusterView`, not as globally effective grants.

`RoleInput={name:string,permissionIds:string[]}`; IDs must be unique catalog literals, ~~at most 50~~ **[NEW]** at most 49 for v1; an empty bundle is valid. `RoleView={id:Id,name:string,permissionIds:string[],revision:Revision}`. Permission IDs sort ordinally. `AssignmentInput={providerId:string,matchKind:subject|claim,claimType:string?,matchValue:string,roleId:Id,scopeKind:environment|cluster,scopeId:string,enabled:boolean}`. `AssignmentView` adds `id` and `revision`. **New proposed extension:** `enabled` permits revoking an individual mapping through the existing PUT endpoint without inventing a DELETE route; existing/new mappings initialize true unless explicitly false. Disabled mappings never grant access. The schema and design UI need this explicit approval.

`PermissionView={id:string,label:string,scope:application|cluster}`. `ClusterView={id:string,environmentId:string,displayName:string,permissionIds:string[]}` lists configuration registrations with at least one effective Gateway operation grant. It makes no background Gateway call and returns no upstream URL, secret reference, credential, or inferred health. Authorized observations come from the explicit C1/C3/C4 routes.

### 3.2 Application Endpoint Matrix

Paths below have `/api/v1` prefix. Responses named here are inside `data`, unless the row explicitly describes a redirect. All POST/PUT calls require `X-CSRF-TOKEN`; authentication callbacks use OIDC protocol protections instead. Every authenticated call checks current session and permissions.

| Method | Path | Input | Response | Access/audit |
|---|---|---|---|---|
| GET | /auth/bootstrap | None | 200 `{providers:[{id,displayName}],antiforgeryToken:string,emergencyEnabled:true}` | Public; no configuration secrets; no-store |
| POST | /auth/login/{providerId} | `{returnPath:string}`; max 2048 UTF-8 bytes; same-origin relative path | 200 `{authorizationUrl:string}` generated by the selected OIDC handler, with correlation/nonce cookies | Public, allowlisted configured provider; browser navigates to handler-generated URL, never a client-supplied destination |
| POST | /auth/emergency | `{password:string}`; 1-4096 UTF-8 bytes, no normalization | 200 `SessionView`, new session cookie | Public, throttled; durable successful-authentication audit before cookie; failures audited without password |
| GET | /session | None | 200 `SessionView` | Valid session; emergency read audited; does not renew idle |
| POST | /session/activity | Empty body | 200 `{lastActivityAt:Instant,idleExpiresAt:Instant,absoluteExpiresAt:Instant}` | Atomic valid-session update; emergency action audited |
| POST | /session/logout | Empty body | 200 `{revoked:true}`; clear cookie | Revoke valid current session; audit; invalid/expired session returns 401 and clears cookie, never revives it |
| GET | /permissions | None | 200 `PermissionView[]`, ordered by ID | app.access.manage; emergency read audited |
| GET | /roles | pageNumber,pageSize | 200 `Page<RoleView>` | app.access.manage; emergency read audited |
| POST | /roles | `RoleInput` | 201 `RoleView`, ETag | app.access.manage; durable attempt, atomic change/result |
| PUT | /roles/{id} | `RoleInput`, If-Match | 200 `RoleView`, ETag | Same access/audit; exact atomic revision comparison |
| GET | /assignments | pageNumber,pageSize | 200 `Page<AssignmentView>` | app.access.manage; emergency read audited |
| POST | /assignments | `AssignmentInput` | 201 `AssignmentView`, ETag | app.access.manage; durable attempt, atomic change/result |
| PUT | /assignments/{id} | `AssignmentInput`, If-Match | 200 `AssignmentView`, ETag | Same access/audit; exact atomic revision comparison |
| GET | /clusters | None | 200 `ClusterView[]`, environmentId then id ordinal | Valid session; empty authorized list is allowed; emergency read audited |
| GET | /audit | pageNumber,pageSize and filters below | 200 `Page<AuditEventView>` | app.audit.view; emergency read audited |
| GET | /audit/{id} | UUID path ID | 200 `AuditEventView` | app.audit.view; emergency read audited; absent event 404 |

OIDC callback success issues the server session only after durable authentication auditing, then redirects to the validated local return path. The client fetches bootstrap again after login/logout to refresh antiforgery state; never cache the token in persistent browser storage. `authorizationUrl` contains protocol state but not an access/refresh token. Failure to construct a valid provider challenge returns a sanitized 503; no partial session is created.

### 3.3 Validation and Audit DTO

Role display-name normalization: trim Unicode whitespace, NFC, require 1-100 Unicode scalar values; reject control characters. Store this as `name`. Compute `normalizedName=ToUpperInvariant(name).Normalize(NFC)` in the pinned .NET runtime, not using DB collation. Allow its expansion up to 300 scalars. A runtime Unicode-table change requires a collision check before upgrade, never silent renaming. Identity/claims are case-sensitive and are never trimmed, uppercased, or Unicode-normalized for matching.

Configuration IDs match `[A-Za-z0-9][A-Za-z0-9._-]{0,63}` and are case-sensitive. Assignment provider must be configured; subject matching requires `claimType=null`; claim matching requires an exact configured allowlisted claim type. Match values are nonempty strings, max 2048 UTF-8 bytes, and must not contain control characters. Scope must exist in current configuration and role must exist. Reject duplicates even when disabled; update/re-enable the existing row. Application-management permissions in scoped roles retain their already-approved application-wide meaning.

`AuditEventView={id,attemptId?,occurredAt,requestId,principal:Principal,environmentId?,clusterId?,operation,target:object,phase,outcome,dryRun,overrideReason?,errorCode?,relatedEventIds:Id[],resolution}`. `phase=ATTEMPT|RESULT|EVENT`; stored outcome `pending|succeeded|failed|partial|denied|previewed|unknown`. ATTEMPT always pending; preview RESULT is previewed, not mutation success. `resolution=not_applicable|resolved|unresolved|related_event_expired` is computed from retained records, never by inferring Kafka state. No mutable update turns an unmatched attempt into success. A missing retained predecessor is reported as unavailable/expired, not fabricated.

Filters: `from` inclusive / `to` exclusive Instant, `authSource`, exact paired `issuer`+`subject` (emergency uses authSource+subject), `environmentId`, `clusterId`, exact `operation`, `outcome`. Unknown filters, invalid enums, reversed ranges, or only one SSO identity component yield 400. Filters combine with AND. Count and page are read in one provider-consistent read transaction. Concurrent later events may shift subsequent offset pages; no frozen-history claim is made. Audit access is application-wide as approved, not filtered by Kafka operation grants.

### 3.4 Error Catalog

Envelope remains `{code,message,status,requestId,fieldErrors?,upstreamCode?,outcome}`. `fieldErrors` is an array of `{path:string,code:string,message:string}` with paths expressed as JSON Pointers or parameter names; max 100 entries, no submitted values. Messages max 1024 UTF-8 bytes. `outcome=not_started|failed|unknown` as approved. Optional error `progress` is a **proposed addition** carrying only the precision-safe typed Gateway replay progress (`copied`, per-partition `cursor`); do not discard known progress on M8 failure. Expose no arbitrary error-details object. Partial-success items stay in the success payload and retain HTTP 207.

| Code | HTTP | Rule |
|---|---|---|
| VALIDATION_FAILED / INVALID_PRECONDITION | 400 | Malformed/invalid inputs; malformed, weak, wildcard, or multiple If-Match values |
| AUTHENTICATION_FAILED / SESSION_EXPIRED | 401 | Generic incorrect emergency password / absent, revoked, expired session; never use for Gateway credentials |
| PERMISSION_DENIED / CSRF_INVALID | 403 | No forwarding; do not reveal hidden registration details |
| NOT_FOUND | 404 | Absent visible registration/resource/entity |
| DUPLICATE_RESOURCE / STATE_CONFLICT | 409 | Duplicate normalized role/mapping, Gateway conflict; no silent upsert |
| REVISION_MISMATCH | 412 | Valid but stale quoted UUID precondition |
| REQUEST_TOO_LARGE / EXPORT_TOO_LARGE | 413 | Input/export bound exceeded; no partial-success download |
| UNSUPPORTED_MEDIA_TYPE | 415 | Invalid upload/body media type |
| PRECONDITION_REQUIRED | 428 | Missing required If-Match |
| THROTTLED | 429 | Retry-After seconds; admission overload or emergency delay |
| UPSTREAM_REJECTED | upstream 400/403/404/409/413/429 | Preserve sanitized upstreamCode and safe semantics; copy validated Retry-After only |
| UPSTREAM_CREDENTIAL_FAILURE / UPSTREAM_FAILURE / UPSTREAM_RESPONSE_TOO_LARGE | 502 | Upstream 401, transport/protocol/server failure, or response cap; no browser re-login implication |
| DATABASE_UNAVAILABLE / AUDIT_UNAVAILABLE / NOT_READY / IDENTITY_PROVIDER_UNAVAILABLE | 503 | Required local dependency unavailable; no bypass |
| UPSTREAM_TIMEOUT / OPERATION_TIMEOUT | 504 | Deadline expired; unknown for a dispatched mutation unless non-execution is established |
| INTERNAL_ERROR | 500 | Sanitized unexpected failure; no stack trace |

Known rejection before dispatch is not_started. An explicitly confirmed operation failure is failed, while acknowledged individual successes remain in item/progress data. Lost acknowledgement, cancellation, malformed/oversized mutation response, or uncertain commit is unknown, not zero writes. For an ambiguous local commit, resolve its unique audit RESULT by ID in a bounded read before reporting unknown; never repeat the local business mutation. An audit-result write error never replaces a known upstream business result with generic 503.

## 4. Persistence and Atomic Operations

### 4.1 Physical Types and Constraints

Unless marked `?`, columns are NOT NULL. UUID: PostgreSQL `uuid`, SQLite `TEXT` with canonical 36-character lowercase hyphenated representation validated before write and CHECK on shape/length. Time/count: `bigint` / SQLite `INTEGER`; milliseconds UTC. Boolean: `boolean` / SQLite integer CHECK IN (0,1). Binary: `bytea` / SQLite `BLOB`, length CHECK. Text: PostgreSQL `text COLLATE "C"`, SQLite `TEXT COLLATE BINARY`; enforce stated UTF-8 byte caps using provider octet-length expressions. Use provider-independent application validation plus migration CHECKs for required lengths/enums/ranges. JSON snapshots are UTF-8 canonical text with sorted object keys, preserved array order, no duplicate object keys, and lossless numbers; never serialize through floating point. SQLite FK enforcement is enabled on every connection. No password hashes, bearer tokens, OIDC tokens, or message payloads enter these tables.

| Table | Columns / exact limits | Keys, relationships, indexes |
|---|---|---|
| Sessions | tokenHash binary32; authSource enum; issuer? text2048B; subject text2048B; claimsJson text65536B; createdAt,lastActivityAt,absoluteExpiresAt time; revokedAt? time; credentialVersion? text128B | PK tokenHash; indexes absoluteExpiresAt and lastActivityAt. Check createdAt <= lastActivityAt < absoluteExpiresAt; absoluteExpiresAt=createdAt+28800000. Emergency requires null issuer, configured emergency subject and credentialVersion; SSO requires issuer and null credentialVersion. Claims contain only verified configured matching claims and bounded display fields. No principal FK |
| Roles | id UUID; name text400B; normalizedName text1200B; revision UUID | PK id; UNIQUE normalizedName; ordered index (normalizedName,id); scalar-count rules validated in application |
| RolePermissions | roleId UUID; permissionId text64B | PK(roleId,permissionId); FK roleId to Roles RESTRICT; CHECK ~~fixed 50-literal catalog~~ **[NEW]** fixed 49-literal v1 catalog excluding gateway.m8; no unknown/wildcard IDs |
| Assignments | id UUID; providerId text64B; matchKind enum; claimType? text256B; matchValue text2048B; roleId UUID; scopeKind enum; scopeId text64B; enabled bool; revision UUID; duplicateKey binary32 | PK id; FK roleId to Roles RESTRICT; UNIQUE duplicateKey; indexes roleId and (providerId,matchKind,enabled). CHECK subject=>null claimType, claim=>nonnull. Scope/provider validated against startup configuration, not DB FKs |
| LoginThrottle | accountId text64B; sourceAddress text45B; windowStartedAt time; failureCount integer0..11; nextAllowedAt time; revision UUID; lastFailureAt? time; recentFailuresJson text128B | PK(accountId,sourceAddress); index lastFailureAt. JSON stores at most four pre-activation timestamps; active escalation has an empty array and lastFailureAt. No FK to sessions |
| AuditEvents | id UUID; attemptId? UUID; occurredAt time; correlationId text128B; authSource text16B; issuer? text2048B; subject? text2048B; displayName? text1024B; environmentId? text64B; clusterId? text64B; operation text128B; targetJson text16384B; phase/outcome enums; dryRun bool; overrideReason? text512B; errorCode? text128B | PK id; indexes (occurredAt DESC,id DESC), (attemptId), (clusterId,occurredAt,id), (operation,occurredAt,id). Unique nonnull attemptId for RESULT (filtered/partial index). No audit FKs or cascades; authentication failures may have unknown subject |

`duplicateKey` is SHA-256 over canonical JSON of providerId,matchKind,claimType,matchValue,roleId,scopeKind,scopeId, excluding enabled/revision/id. On uniqueness conflict compare full fields: equal => DUPLICATE_RESOURCE; unequal => sanitized INTERNAL_ERROR plus security diagnostic, never merge on a hash collision. This avoids oversized composite indexes on PostgreSQL. Audit targets are allowlisted non-secret identifiers/counts, never request-body snapshots. Reject invalid control characters and byte length for override reasons, preserving the approved 512-byte ceiling. Do not truncate security-relevant identifiers into ambiguous values.

No role/assignment delete API is proposed. Revocation uses disabled assignments or changed permission bundles. Removing assignments' last grant takes effect on the next request. Referenced configuration removal makes affected assignments ineffective and emits a startup diagnostic, never broadens their scope; administrators must reconcile them.

### 4.2 Sessions and Authorization

Generate 32 cryptographically random session bytes; return only the base64url bearer cookie, store SHA-256 bytes. Login auditing and session insertion commit atomically before setting the cookie. Revoke a replaced session when known. On every request load session plus current applicable role/assignment data in one consistent read transaction; check now >= min(lastActivityAt+4h,absoluteExpiresAt), revocation, issuer/provider config, and emergency credential version. No authorization cache may grant from stale roles. The decision applies to that admitted call, not all future replay batches.

Activity uses a single conditional UPDATE by tokenHash: unrevoked, current credential version, lastActivityAt+4h > now, absoluteExpiresAt > now; set lastActivityAt=MAX(lastActivityAt,now). Zero affected rows is 401, except a dependency error is 503. Concurrent revocation and activity cannot undo revocation. PostgreSQL row-level write serialization and SQLite short immediate transactions enforce the predicate at write time. Revocation is an idempotent conditional UPDATE; do not clear revokedAt. Local access changes commit their new UUID revision, complete permission membership replacement, and RESULT together after the separately committed ATTEMPT. Stale-revision rejection writes a failure/denial event without changing the entity.

### 4.3 Persistent Throttling

Normalize client addresses with the platform IP parser: IPv4-mapped IPv6 becomes IPv4, IPv6 uses canonical compressed lowercase text; trust forwarded headers only from configured proxies. Use the approved single account ID. Acquire a nonwaiting account/address mutex, then one of two process-wide password-verification permits; failure returns 429 Retry-After 1 with no hashing/count change. These process-local locks are correct only under the approved non-overlapping single-replica deployment. Hold them through checking/updating durable throttle state, but never hold a DB transaction across password hashing.

Before activation remove timestamps <= now-15min, preserving exact rolling-window semantics for the first four failures. On fifth failure activate delay1s; failures6..10 use2,4,8,16,32s; 11+ use60s with a saturated count11. Activation stores lastFailureAt and clears the pre-activation list. Reset only after successful verification or now >= lastFailureAt+15min. Early arrival before nextAllowedAt returns 429 with ceiling(remaining seconds), does not hash, and does not move lastFailureAt. First failure after reset starts a new window. Update the row using revision CAS in a short transaction; concurrent insert uniqueness conflict re-reads, never loses a failure. On persistence failure deny login, release permits, and report503.

Successful emergency login commits throttle reset, authentication audit, and session insertion together; failure means no cookie. Failed verification commits throttle state before returning generic401; a later authentication-failure audit failure never permits access. Cancellation after verification still finishes the bounded throttle update; process crash during hashing cannot promise counting an uncompleted verification. Expired throttle rows can be deleted hourly only after15min inactivity with no active in-process verification; DB CAS prevents deleting an updated row.

### 4.4 Retention and Diagnostics

Use one TimeProvider-based hourly scheduler, no overlapping runs. Freeze cutoff=runStart-retention once per run. Select/delete oldest IDs where occurredAt < cutoff, ordered (occurredAt,id), at most1000 rows per short transaction; continue batches up to a proposed30-second run budget. Remaining eligible rows wait for the next hourly run. No audit FK means expired attempt deletion cannot delete an in-window result. On failure stop this run, emit structured ERROR `AUDIT_RETENTION_FAILED` without sensitive values, increment `kafka3o_ui_audit_retention_failures_total`, and retain the last-success timestamp gauge. Ship a deployment alert rule for any failure increase or no successful run for2h; the deployment must wire its alert receiver. This does not add an application message queue or bypass recording. Test alert-rule evaluation and delivery in deployment acceptance, not only the logged message.

Expired/revoked sessions are cleaned hourly in bounded1000-row batches only when already invalid. Never delete a valid session to relieve storage pressure. Database-full remains a fail-closed dependency failure.

## 5. Resource Bounds and Lifecycle

| Resource | Proposed concrete contract |
|---|---|
| Non-upload request | 10,000,000 bytes maximum for Gateway JSON bodies; application-owned auth/access/session JSON maximum131072 bytes, plus the smaller field limits above; headers total32768 bytes and URL8192 bytes; count actual streamed bytes, not only Content-Length |
| Upload | Approved10,000,000 bytes; max2 simultaneous buffered uploads, no queue,429 Retry-After1; validate whole file before mutation; clear/release buffer on all exits |
| Export | Approved10,000,000 bytes; in-memory segmented buffer, max2 exports process-wide, no queue,429 Retry-After1; enforce size while reading, reject excess413 without attachment headers; no disk spool; dispose after send/cancel |
| Other Gateway responses | Proposed20,000,000 decoded bytes, max16 concurrent Gateway calls process-wide, max4/session; no queue,429 Retry-After1. Oversize502 with unknown if mutation may have executed; never truncate a successful response |
| Deadlines | Preserve connect5s, read30s, mutation/replay60s, throughput sample+10s max70s, each audit5s, application85s, ingress100s |
| Scan bounds | Effective maximum=min(UI ceiling, configured per-cluster Gateway ceiling); validate selected positive bounds before dispatch, including maxTimeMs <= call budget minus5s. Omitted bound uses explicit reviewed configuration, not an assumed upstream default. Configuration must state deployed Gateway bounds and version; mismatch blocks that workflow, not permission checks |
| Startup | Validate configuration, credential references, emergency hash/version, installed key manifest, DB connectivity, exact provider migration set, recovery marker, and protected-volume permissions before readiness. No automatic migrations, first-install key regeneration, or multiple replica admission |
| Health | Public `/health/live` returns200 `{status:"live"}` while process/event loop functions. `/health/ready` returns200 `{status:"ready"}` or503 `{status:"not_ready"}`. No dependency names/errors/secrets. Readiness checks DB/schema/key/recovery state; individual Gateway availability is a cluster status, not global readiness |
| Shutdown | First mark unready and reject new operations503; cancel polling/scheduler/new replay admission; drain admitted work up to90s, retaining result-audit opportunity; process grace110s. Interrupted writes unknown, never replayed |

These new admission/body/response limits require approval; they do not justify silently shrinking the mandatory Gateway workflows. Deployment acceptance must prove supported inputs fit the configured ceilings. If required functionality exceeds them, return for an explicit sizing decision, not an undocumented omission.

A monotonic TimeProvider deadline spans validation, audit, Gateway, and response preparation. Gateway time includes connection time; enforce the smaller remaining deadline at every stage. Reserve5s for independent result recording, which ignores client disconnect but respects its own5s bound and process shutdown budget. Begin no mutation if its configured execution budget plus result reserve cannot fit. No automatic mutation retry, including HTTP client resilience retries. No transaction remains open across HTTP calls.

C11 fetches the complete original export bytes and finishes required result-recording attempt before sending headers. It keeps the file content unchanged, sets attachment filename from a sanitized fixed template, and includes `X-Request-Id` and `X-Kafka3O-Audit-Status`. `recording_failed` is a download warning, not a retry signal. Browser code checks metadata before reporting success. All auth/session/audit/secret-bearing and message responses use Cache-Control:no-store; no response-body logging. Bodyless probes must not renew sessions.

Bounds configuration cannot cure native latest scan's incorrect completion report; section 8 remains blocking. Throughput requests exceeding sample/deadline limits fail validation before dispatch rather than being silently shortened.

## 6. Maintenance and Recovery

Commands below run the same server executable in maintenance mode, not an HTTP admin endpoint. No new application project or long-running worker is proposed. All secrets and connection strings come from protected configuration/secret mounts, never command-line arguments or output. Maintenance requires the web process stopped and a deployment-level exclusive lease; SQLite additionally uses an exclusive local lock, PostgreSQL a session advisory lock. Refuse operation if exclusivity cannot be established.

| Command | Preconditions and effects | Success evidence |
|---|---|---|
| `maintenance keys initialize --installation-id <uuid>` | First install only, explicit stopped-app marker, empty key directory and no prior manifest; generate protected key ring using mounted encryption certificate; never overwrite a ring | Atomic protected manifest with installation ID, key IDs and certificate thumbprints; decrypt round-trip test; no key material printed |
| `maintenance keys verify` | Read-only; check manifest, all required keys and certificate private-key access, ownership/mode, and decrypt representative protected payload | Sanitized JSON `{command,status,installationId}` and exit0; missing/unreadable/mismatched material nonzero |
| `maintenance database migrate --backup-manifest <path>` | Stopped app; backup manifest verifies matching DB/provider/key manifest and hashes; select provider migrations explicitly; run forward only | Exact expected migration IDs, constraints, schema validation; failure remains stopped, never automatic down migration |
| `maintenance recovery begin --incident-id <uuid>` | Stopped app, before any restore; create protected recovery-pending marker on durable operations volume outside the restore set | Atomic marker visible to startup gate; existing marker requires explicit continuation, not overwrite |
| `maintenance recovery reconcile --manifest <path>` | Matching DB/key backup restored; pending marker; reviewed role/assignment and credential-version reconciliation file; verify keys and schema; invalidate ALL sessions and apply reviewed access state | Durable recovery audit RESULT in same DB transaction as reconciliation; marker cleared atomically only after verified commit and report; failure retains marker |

Proposed exit codes:0 success,2 invalid input/configuration,3 exclusivity/precondition failure,4 key/schema/backup validation failure,5 execution/dependency failure. Output contains no secrets. The reconciliation manifest contains installation/incident ID, backup hashes, the exact current role/assignment IDs/revisions and reviewed desired values, expected emergency credential version, and operator approval reference. Hash/match the restored state to that reviewed manifest before applying; reject concurrent/stale state. Reconcile never grants access simply because a backup contains it.

Backup procedure: stop application, acquire maintenance exclusivity, run keys verify; SQLite use its online backup API/CLI backup command against the stopped DB (not copying only the main file while ignoring WAL); PostgreSQL use matching-major `pg_dump` custom format. Back up protected key ring and installation manifest, and securely escrow required encryption certificates via the organization's secret-backup process. Record UTC time, provider/schema IDs, tool versions, installation ID, and SHA-256 checksums in the backup manifest. Encrypt backup storage, restrict access, and test restore in isolation. A checksum is integrity evidence, not protection against a privileged attacker who can replace both backup and manifest.

Restore procedure: execute recovery begin on the live operations volume; restore matching database/key material into a stopped isolated target; use SQLite backup restore or matching-major `pg_restore` into a clean database; verify schema and keys; invalidate sessions and reconcile access through the command; verify readiness before admitting traffic. Data Protection certificate rotation mounts old+new certificates, selects the new encryptor on the next non-overlapping restart, verifies old decryption, and retains older certificates until both live keys and retained backups no longer need them. Do not delete old keys solely because the current cookie has expired.

The recovery marker is deliberately outside the restored snapshot so an old backup cannot clear it. This gate relies on the authorized operator using recovery begin; arbitrary privileged out-of-band database replacement is not automatically detectable. Document and test that operational trust boundary. Use incidentId as the reconciliation ATTEMPT's ID and the RESULT's attemptId; the unique RESULT constraint establishes commit identity. Record the reviewed manifest hash, not its access/secret contents, in the sanitized target. Crash after DB commit but before marker removal leaves access blocked; rerunning reconcile verifies that RESULT and manifest hash and does not apply twice. If retention has removed this evidence, stop for a newly reviewed recovery decision rather than infer completion. Lost marker/manifest or mismatched installation fails closed and requires operator recovery, not regeneration.

Normal configuration changes are restart-only. Credential-version changes invalidate emergency sessions before readiness; changing a provider issuer must not reinterpret old sessions under the new issuer. No maintenance action replays unresolved Kafka attempts, promises Kafka rollback, or weakens the all-severity zero-CVE policy.

## 7. Executed Compatibility Evidence

An external Go overlay injects test code into the Gateway API test package without editing Gateway files. The harness uses actual HTTP handlers with the existing fake Kafka/test server, loopback only. It does not contact a real broker, production Gateway, or IdP. Test locations and reproduction command:

```powershell
# Run from D:\sources\Kafka3O-Gateway
go test -overlay D:\sources\kafka3o-compat-review-20260925\overlay.json ./internal/api -run '^TestUICompat' -count=1 -v
```

Harness source: `D:\sources\kafka3o-compat-review-20260925\compatibility_test.go`. Overlay mapping: `D:\sources\kafka3o-compat-review-20260925\overlay.json`. Both are outside the Gateway repository; they are local investigation artifacts, not a committed portable test suite. Capture them with the later contract-test fixture work before relying on reproducibility on another machine.

| Probe | Observed result | What it does not establish |
|---|---|---|
| TestUICompatReplayEmptyConfirm | PASS: M8 empty-confirm preview200; execution400; destination unchanged | Live Kafka or every replay parameter combination |
| TestUICompatDestructivePreviewMatrix | PASS:17 additional D routes; preview200/dryRun true; empty-confirm execution400 CONFIRMATION_MISMATCH; zero mutating fake calls after fixture setup | Every possible validation/safety failure or production artifact compatibility |
| TestUICompatPartitionReadsKeepFrozenBounds | PASS: M1/M3/M4, two partitions, one result/batch, per-partition next offsets; four original records once; appended records excluded | Global ordering/limit equivalence, compaction gaps, timestamp disorder, all scan stop conditions, or large-int precision |
| TestUICompatPartitionReplayFrozenBoundsAndFailure | PASS: two partitions, frozen ends, four acknowledged copies; injected later-batch produce failure reports copied0 and unchanged cursor; explicit test-controlled resume | Ambiguous acknowledgement, within-batch partial success, UI auto-resume safety, or exactly-once delivery |
| TestUICompatCharacterizeLatestPreviousWindow | LIMITATION reproduced: native latest + to=offset:4 + limit2 with current end6 returns no records; explicit [2,4) returns two | That explicit offset fan-out is a complete latest-N adapter |
| TestUICompatCharacterizeLatestByteBound | LIMITATION reproduced: latest limit3/maxBytes1 scans1 yet reports reachedEnd=true and stoppedBy=null | A truthful completion indication for native latest scans |

Executed suite: six top-level tests and20 subtests, all assertions passed. Two top-level tests deliberately assert limitations; they are not passing product acceptance criteria. Fixture offset decoding uses small exact integers through the existing Go helper's float64 decoding: **no evidence for offsets beyond JavaScript's safe integer range**. The fake explicitly does not simulate compaction. A test-directed retry after a known injected failure is not authorization for automatic retries after uncertain writes.

## 8. Exact Remaining Compatibility Blocker

**B1: latest-mode continuation and truthful completion are not yet fully specified or proven without Gateway changes.** At the pinned revision, latest lower bounds derive from the current end before applying the requested upper bound; the scan finalization overrides completion/stop information in latest mode. Thus a client cannot simply feed the returned cursor back into native latest paging and claim a complete preceding window. Reproductions are in section 7; relevant controlling code is the Gateway's message window resolution and `internal/scan` runner finalization. **[NEW]** Section 8.1 selects the adapter direction, not a proven algorithm.

**B2: the successful explicit-window primitives do not establish aggregate multi-partition semantics.** A UI adapter must preserve every selected partition's frozen upper bound and next offset, exact totals and remaining global limits, deterministic latest ordering, unreturned buffered records, and per-batch replay outcomes. Equal timestamps, nonmonotonic timestamps, sparse/compacted offsets, bounds reached on a non-emitting record, new partitions, retention advancing the begin offset, disconnect after write, and concurrent continuation are not covered by these probes.

Recommended investigation direction, not an approved implementation contract: snapshot begin/end bounds through authorized T2 when needed; scan each selected partition using explicit offsets without native latest completion flags; preserve all continuation state including unreturned records; derive completion only from evidence for every fixed window; merge by Gateway timestamp order with an explicitly reviewed tie rule. Do not use `end-limit` as proof of the latest matching records on sparse logs. Latest-N equivalence and preceding-window semantics must be proved before selecting a state/token/storage contract. Keep calls bounded and resume only by valid user-directed workflow state; each call rechecks permissions/audit and cannot inherit an override reason.

This may require a bounded client/server continuation-state design beyond the approved mirrored DTOs. Its shape, ownership, expiry, tamper protection, total memory budget, and handling of records fetched but not shown remain unresolved. P1-P6 approval must not authorize an invented browser cursor-map field or an unbounded in-memory cache by implication. If no adapter can meet the retained requirements and bounds, report that incompatibility to the user. Do not omit latest-N, partition coverage, or safety semantics; do not modify Gateway.

### 8.1 Approved B1/B2 Direction and Starting Limits

**[NEW]** Approved on 2026-09-25 in response to the explicit B1/B2 recommendations. The preceding paragraphs retain the original investigation history; this subsection supersedes their pending choices only as enumerated here. Limits are selected design values requiring validation, not benchmarked capacity claims.

**B1 selection:** Use a UI-backend adapter with fixed per-partition offset windows, leaving Gateway unchanged. Freeze selected partition bounds when the workflow starts; continue using explicit offsets instead of native latest-mode continuation. Preserve the required descending-timestamp ordering and preceding-window behavior. Bounded or interrupted scans remain visibly incomplete; an empty response alone does not establish completion. Prove behavior with sparse offsets, equal/nonmonotonic timestamps, appended records, and byte/time limits before closing B1. Discovery through T2 still requires its separately approved permission; no direct Kafka access is introduced.

**B2 selection:** Keep short-lived, bounded continuation state in server memory under the approved single-replica deployment. Do not persist buffered message payloads in the application database. Retain partition bounds, cursors, unreturned records, remaining aggregate limits, and acknowledged replay progress. An opaque token binds the state to the user's session and configured cluster; possession of the token does not replace current authorization.

| Setting | Approved starting value or behavior |
|---|---|
| Idle expiry | 10 minutes |
| Absolute lifetime | 30 minutes, never beyond session expiry |
| Active workflows | At most 2 per session and 20 application-wide |
| Buffered data | At most 20,000,000 bytes per workflow and 100,000,000 bytes application-wide |
| Token | 32 cryptographically random bytes, bound to session and cluster |
| Concurrent continuation | One request per workflow; reject competing requests, never advance the same state twice |
| Capacity exhausted | Reject admission explicitly; never silently evict active workflows |
| Expired or lost state | Require explicit restart; replay restart warns about duplicate risk |
| Authorization and replay safety | Recheck permissions on every continuation; never automatically retry uncertain writes |

**[NEW]** Existing call deadlines, audit gates, request-scoped override rules, session inactivity rules, and no-silent-scope-reduction constraints still apply. Workflow state must not turn bounded synchronous replay into a durable background job. In-memory state loss does not mean Kafka writes were undone.

### 8.2 Remaining Contract and Proof Work

**[NEW]** Still to define and approve: workflow methods/paths and DTOs; precise state transitions and error codes; immutable input binding; ordering tie rules and complete latest-window algorithm; token transport/storage and cleanup; idle-refresh rules and expiry during an in-flight call; byte accounting including buffers/in-flight results and memory overhead; capacity reservation; request sequencing and lost-response handling. The approved caps cannot imply unlimited metadata or bypass other admission limits. Do not invent these details as already approved.

**[NEW]** B1/B2 remain open pending those contracts and executable adapter proof for ordinary, sparse, adversarial-order, and ambiguous-failure fixtures. Design status remains **BLOCKED** and release verification **PENDING**. This update records decisions and runs documentation checks only; it does not edit or rerun the external harness, change Gateway, or authorize task creation.

### 8.3 Approved Workflow Recommendations

**[NEW]** Approved on 2026-09-25 by the user's "approve" response to the six further recommendations. These rules refine section 8.1 and supersede section 8.2's pending choices only to the extent stated below. They do not select unpresented route names, DTO fields, status codes, or a complete adapter algorithm.

| Decision | Approved rule |
|---|---|
| W1 Explicit workflow API | Separate create, advance, inspect, and stop operations. Carry continuation tokens in a dedicated header, never in URLs or logs. These are UI-backend operations, not Gateway API extensions. |
| W2 Immutable inputs | Bind each workflow to its operation, cluster, topics, partitions, filters, and frozen bounds. Changed inputs require a new workflow; do not reinterpret an existing cursor under changed inputs. |
| W3 Revision-protected advancement | Require the expected workflow revision. Reject stale or competing requests. A repeated request must never dispatch the same replay batch again: return its retained result when available, otherwise report uncertainty. Token possession and retained-result retrieval do not bypass current authorization. |
| W4 Defined states | Use `ready`, `running`, `paused`, `completed`, `stopped`, and `unknown`. Stop prevents new calls but does not promise cancellation or rollback of an in-flight write. The complete transition table remains to be specified. |
| W5 Precise expiry | Refresh workflow idle time only on accepted user-directed advancement. Inspection, polling, and automatic replay batches do not extend it. Expiry prevents new calls while allowing bounded result-audit completion for an admitted call. It cannot extend the workflow's absolute lifetime or the user's session lifetime. |
| W6 Capacity reservation | Reserve buffer space before fetching. Count retained payload copies and in-flight response buffers against their applicable limits. Never discard unreturned records silently to make space. |

**[NEW]** Retain all section 8.1 values: 10-minute idle expiry, 30-minute absolute lifetime bounded by session expiry, at most 2 workflows per session and 20 application-wide, buffered-data caps of 20,000,000 bytes per workflow and 100,000,000 bytes overall, and session/cluster-bound tokens generated from 32 random bytes. Required audit gates, per-call permissions, conditional T2 authorization, request-scoped overrides, and no automatic retry of uncertain writes remain unchanged. Retained results consume the applicable capacity; this approval does not permit an unbounded result cache or claim exactly-once Kafka delivery.

### 8.4 Remaining Exact Contracts and Verification

**[NEW]** Still to define and approve together: exact workflow methods/paths, header name, request/response DTOs, revision/request identity and duplicate-result lookup rules; full transitions and error/status mapping, including admission rejection, stop/expiry races, retained-result availability and cleanup; token encoding/client storage; latest-window boundaries, timestamp tie ordering and completion algorithm; precise buffer accounting, metadata/allocator overhead bounds, reservation/release mechanics and oversized-record handling. These are details not supplied by W1-W6, not requests to reapprove the selected principles.

**[NEW]** Verification must cover immutable-input rejection, cross-session/cluster token use, current authorization on retained results, stale/concurrent/repeated advance requests with zero duplicate dispatch, stop and expiry during a call, no idle refresh from inspection/automatic batches, capacity exhaustion with no silent record loss, and lost acknowledgements. B1/B2 also retain their sparse-offset and adversarial-order adapter proof requirements. No such new tests were run for this approval record; section 7 remains historical evidence only.

**[NEW]** Design status remains **BLOCKED**; release verification remains **PENDING**. Gateway and the external harness remain unchanged. This is approval of W1-W6, not closure of B1/B2, full Step 8 sign-off, or permission to create tasks.

### 8.5 Approved Item-1 Contract Package

**[NEW]** On 2026-09-25 the user approved all six recommendations for item 1 (API, DTOs, revisions, states, errors/expiry, and buffer accounting). These are normative selections, not implementation or compatibility evidence.

#### I1 Workflow API and Token Transport

Base path: `/api/v1/clusters/{clusterId}/message-workflows`.

| Method | Path relative to base | Purpose |
|---|---|---|
| POST | Base path | Create and freeze validated inputs/bounds; no replay writes |
| POST | /advance | Execute one bounded synchronous batch |
| GET | Base path | Inspect status/progress without advancing |
| POST | /stop | Prevent additional Gateway calls |

Return the token in `X-Kafka3O-Workflow-Token`; require that header on subsequent workflow operations. Encode the approved 32 random bytes as unpadded base64url. Keep the token only in browser memory, never URLs or persistent browser storage; redact it from telemetry. Use `Cache-Control: no-store`. These four UI-backend routes supplement section 3.2's 16 application routes; they do not replace the 47 Gateway-operation bindings or extend Gateway. Existing session/current-permission checks and POST CSRF requirements apply.

#### I2 Typed Requests and Responses

- Create body: `{operation, inputs}` with operation-specific schemas derived from the approved message contracts, not arbitrary JSON.
- Advance body: `{advanceId}`, a client-generated UUID. Require the current strong UUID `If-Match`. Mutation confirmation and override details remain request-scoped under existing rules; this selection does not invent their remaining workflow transport fields.
- Inspect and stop accept no message-selection inputs.
- Use the existing `{data,meta}` response envelope. Workflow data contains `state`, `revision`, frozen partition bounds, progress, expiry timestamps, and operation-specific results. Inspection returns metadata/progress, not buffered message bodies.
- Preserve decimal-string int64 transport. Changing topics, filters, partitions, or bounds requires a new workflow.

These selections name the request shapes and response content, not complete field-level schemas, operation discriminator values, or a success-status matrix.

#### I3 Revisions and Duplicate Requests

Use both the expected revision and `advanceId`: revision prevents competing/stale advancement; request identity identifies an attempt after a lost response. After current authorization, check duplicate identity before rejecting the original revision as stale. An identical completed request returns its retained result; an in-flight duplicate returns `409 WORKFLOW_BUSY`. Reusing an ID with different request content returns `409 REQUEST_ID_REUSED`.

Retain the latest result until the next accepted advancement or workflow expiry. The next accepted advancement using that result's revision acknowledges it. Older requests never dispatch again; an unavailable retained result requires explicit recovery, never automatic replay. Retained-result retrieval does not bypass current authorization or repeat a Kafka mutation. Request identity does not replace the existing server-generated correlation/request ID. The bounded identity-history mechanism and exact request-equality definition still require specification under section 8.6.

#### I4 State Transitions

| Event | Result |
|---|---|
| Successful creation | `ready` |
| Accepted advancement | `running` |
| Batch ends, more work remains | `paused` |
| Proven completion | `completed` |
| Stop accepted with no call in flight | `stopped` |
| Write acknowledgement is uncertain | `unknown` |

During an in-flight call, stop sets `stopRequested=true`; the admitted call finishes within existing deadlines, with no subsequent dispatch. An uncertain write takes precedence over `stopped`. Never resume `unknown` automatically. Stop does not promise cancellation or rollback of in-flight writes. This is the approved transition subset, not a complete event-by-state matrix.

#### I5 Errors and Expiry

Preserve the existing error envelope and status conventions, including truthful `outcome` and typed replay progress where applicable.

| HTTP | Selected workflow use |
|---|---|
| 428 | Missing required revision |
| 412 | Stale revision |
| 409 | Busy workflow, invalid state, or unavailable retained result; I3 supplies the selected busy/ID-reuse codes |
| 429 | Workflow or buffer admission capacity exhausted |
| 413 | A record/result cannot fit the permitted bound |
| 404 | Unknown token or wrong session/cluster binding, without revealing ownership |

On expiry, prohibit new calls immediately. Release payloads when admitted work and bounded result auditing finish. Restart must be explicit; replay restart warns about possible duplicates. Inspection and duplicate-result retrieval do not renew idle time. Existing authentication failures, deadlines, audit gates, session/absolute lifetimes, and no automatic uncertain-write retry remain unchanged.

#### I6 Buffer Accounting

Retain buffered-data caps of 20,000,000 bytes per workflow and 100,000,000 bytes application-wide. Reserve capacity atomically before fetching. Charge actual allocated buffer capacity, including retained results, unreturned records, serialization copies, and in-flight responses. Prefer pooled byte buffers and avoid retaining both raw and decoded payload copies. Release reservations on every completion/error path, without releasing the charge for data still retained or silently dropping unreturned records.

Adopt separate metadata caps of 1,000,000 bytes per workflow and 20,000,000 bytes application-wide, with explicit rejection rather than silently omitting partitions. Validate allocator/runtime overhead through memory tests; payload caps alone are not a process-memory guarantee. Existing workflow count/lifetime limits and other resource admission limits remain mandatory. These are selected limits, not measured capacity claims.

### 8.6 Remaining Detail and Proof After Item-1 Approval

**[NEW]** Section 8.5 supersedes section 8.4's pending choices only to its explicit extent. Still required: complete operation-specific DTO fields, validation and success responses; exact request-scoped confirmation/override transport; full transition/error-code matrix and stop concurrency/revision behavior; request equality, bounded duplicate-identity history and revision-update mechanics; result/recovery behavior after retention loss; cleanup/admission races; concrete metadata/allocator accounting and reservation/release algorithms. No omitted detail is approved by implication.

**[NEW]** Latest-window boundaries, deterministic timestamp ties, completion algorithm, sparse-offset and adversarial-order equivalence, aggregate limits and replay uncertainty proof remain open. Section 8.4's executable checks remain required, extended to the selected routes/header, request-ID reuse, duplicate lookup before stale-revision rejection, retained-result acknowledgement/cleanup, metadata caps, and no duplicate dispatch after result loss. No adapter/application tests or memory benchmarks were run for this approval.

**[NEW]** B1/B2 remain open; design status remains **BLOCKED** and release verification **PENDING**. Gateway and the external harness remain unchanged. Full Step 8 review and separate READY sign-off still precede Step 9. This approval records I1-I6, not a complete algorithm, audit sign-off, or task-creation authorization.

## 9. Acceptance and Next Gate

The implementation acceptance suite must compare the 47 endpoint rows with the pinned served schema, test each literal permission/tier/audit profile and denial, validate all application DTO/error branches, and exercise CSRF, exact int64 boundaries, null/encoding/header round trips, 201/207 and replay-progress errors. It must run provider-equivalent schema/uniqueness/CAS/expiry/throttle/retention/recovery tests against actual temporary SQLite and PostgreSQL, including concurrent activity/revocation, duplicate assignment insertion, migration failure, stale reconciliation, and crash after commit before marker removal.

Operational acceptance covers export/upload caps and cancellation, no headers before audit attempt completes, admission saturation, deadline nesting, startup/readiness/shutdown, restore drills, certificate rotation with old backup decryption, and alert delivery. Tests must prove no mutation after failed pre-action audit and no retry/rollback claim after result-audit failure. Current fake-backed probes do not satisfy those application/deployment gates. B1/B2 require an executable adapter proof against ordinary, sparse, adversarial-order, and ambiguous-failure fixtures before their design can be declared settled.

No application build, browser test, real Kafka integration, IdP integration, deployment, benchmark, resolved dependency audit, or artifact/container vulnerability scan was performed for this proposal. Existing stack approvals remain unchanged; missing test/deployment pins and all-severity zero-CVE evidence remain explicitly pending for release. ~~After the user approves the selected proposals and the compatibility design is resolved, perform the complete Step 8 review; only a separately approved READY verdict allows Step 9.~~ **[NEW]** The user approved the decision package on 2026-09-25. Once the compatibility design is resolved, perform the complete Step 8 review; only a separately approved READY verdict allows Step 9. Recording this approval runs documentation checks only and does not rerun or extend section 7's historical compatibility evidence.

## 10. Approval History

| Revision | Date | Decision |
|---|---|---|
| 0.1 | 2026-09-25 | Consolidated proposal and isolated compatibility evidence prepared for user review. |
| 0.2 | 2026-09-25 | **[NEW]** User approved P1-P6, including Assignment.enabled, typed replay-error progress, resource limits, storage rules, and maintenance commands; approved P7's retained B1/B2 blockers and investigation direction, not a continuation algorithm. Incorporated by TECH-SPEC section 12. No READY or release sign-off. |
| 0.3 | 2026-09-25 | **[NEW]** Approved B1 explicit-offset adapter direction and B2 server-memory state with 10-minute idle / 30-minute absolute expiry, 2 workflows/session / 20 total, 20,000,000 bytes/workflow / 100,000,000 total, session/cluster-bound random tokens, serialized continuation, and explicit admission/restart behavior. Full API/state contract and compatibility proof remain pending; no READY sign-off. |
| 0.4 | 2026-09-25 | **[NEW]** Approved W1-W6: separate workflow operations/header token transport, immutable inputs, revision-protected nonduplicating advancement, six named states, user-directed idle refresh with bounded in-flight result auditing, and capacity reservation. Exact contracts and executable proof remain open; no READY or release sign-off. |
| 0.5 | 2026-09-25 | **[NEW]** Approved I1-I6: four message-workflow routes, header/base64url/browser-memory token contract, typed request/response selections, revision plus advanceId duplicate handling and retained-result acknowledgement, selected transitions/stopRequested, error/expiry behavior, allocated-buffer accounting and separate 1,000,000/20,000,000-byte metadata caps. Remaining schemas/state-machine details and adapter proof stay open; no READY or release sign-off. |
| 0.6 | 2026-09-26 | **[NEW]** Approved reduced-v1 scope: 40 active command IDs / 46 operations / 49 permissions; single-partition explicit-offset one-shot M1/M3/M4; M8 and section 8's resumable workflow contracts deferred. V1-specific backend/acceptance rules in section 11; B1/B2 retained for deferred features, not fixed. Separate audit/sign-off and all release gates remain. |

## 11. Approved Reduced-V1 Contract Overlay

**[NEW]** Approved on 2026-09-26. This section supersedes earlier v1-wide completeness and B1/B2 requirements only for the explicitly deferred features below. It is an approved scope reduction, not permission for additional omissions. Retain P1-P6 for the remaining operations and application functions. Historical M8-specific details and section 8's B1/B2, W1-W6, and I1-I6 selections remain deferred design history requiring review before reintroduction.

### 11.1 Active Routes and Permissions

- **[NEW]** V1 registers 46 explicit Gateway-operation bindings: the section 2.2 matrix excluding M8. The unchanged Gateway catalog still has 41 command IDs / 47 operations; v1 has 40 command IDs / 46 operations. Keep all cluster, topic, consumer-group, SCRAM and quota operations, M2, and M5-M7.
- **[NEW]** Keep the 16 application endpoints from section 3.2. Do not register the mirrored POST `/api/v1/clusters/{clusterId}/replays` or any of the four `/message-workflows` operations. Unregistered API requests follow the existing 404 NOT_FOUND convention and cannot reach a proxy or Gateway replay call. No emergency-account exception enables a deferred endpoint.
- **[NEW]** Remove `gateway.m8` from the v1 permission catalog, role-input allowlist, database permission CHECK, effective permission output and UI choices. The active catalog contains 46 Gateway literals plus `app.access.manage`, `app.audit.view`, and `gateway.lock.override`, 49 in total. This is a first-release design, not an authorization-data migration from an existing deployed UI. Unknown/deferred role-input permission IDs are rejected under existing validation rules.

### 11.2 Bounded Message Request Contract

- **[NEW]** M1/M3/M4 retain their approved mirrored routes, operation permissions, Gateway DTO references, response envelope and scan fields. Narrow the inherited request schema: explicitly supply exactly one partition and both `from` and `to` as offset selections. Preserve existing offset serialization and range validation. Omitted/all/empty/multiple partition selection, omitted boundaries, and beginning/latest/timestamp boundary modes return 400 VALIDATION_FAILED before a message scan is dispatched. Never silently select a partition or rewrite a mode.
- **[NEW]** A valid submission sends one bounded Gateway message scan to that partition with those requested offsets, subject to existing Gateway window resolution and configured ceilings. Preserve Gateway record order; no timestamp sort/merge or partition fan-out. T2 remains an optional separately authorized metadata action, never an implicit grant or prerequisite for sufficient explicit inputs. No UI cross-request bound snapshot is created.
- **[NEW]** Keep all M3 search fields and M4 operators, record encodings, repeated headers, precision-safe offsets, and configured per-request scan bounds. Keep the existing no-store, secret-redaction, CSRF, authorization, request-scoped override, audit, deadline and error contracts. The restrictions apply only to M1/M3/M4 selection, not to retained timestamp/multi-partition functionality elsewhere.
- **[NEW]** Preserve `scanned`, `matched`, `skipped`, `bytes`, `elapsedMs`, `reachedEnd`, `stoppedBy`, and cursor values as reported scan information. Do not expose an advance/resume control or automatically reuse cursors. A new user submission is an independent query, not acknowledgement, continuation, or recovery of the previous result.
- **[NEW]** Empty results and elapsed-time/bound stops do not establish exhaustive search or an immutable source. Preserve incomplete state; never infer completion from item count, missing trailing offsets, or timeout. Gateway-reported exhaustion applies to that call's resolved window only. Retention, compaction and later writes may change observations between independent requests. Requested bounds must not be presented as proof that the entire requested range was scanned.

### 11.3 Request Lifecycle and Resources

**[NEW]** Use ordinary request loading/result/error states and existing deadline/cancellation behavior. No server-side resumable message workflow, token, workflow revision, advance-ID ledger, retained-result acknowledgement protocol, or workflow cleanup scheduler is built for v1. Section 8's workflow count, lifetime, payload and metadata caps belong to the deferred feature, not an additional active v1 subsystem.

**[NEW]** Section 5's request-local upload/export/response limits and Gateway concurrency remain mandatory, including the 20,000,000-byte other-response limit and explicit oversize failure. Bound response processing and allocations, release request buffers on success/failure/cancellation, and retain no server-side message payload cache after the response lifecycle. Client results remain transient under existing browser-state rules. Validate allocation and cleanup safety; removing workflow retention does not permit unbounded buffering.

**[NEW]** Replay, preview/re-drive and replay recovery are absent. Cancellation/navigation cannot establish non-execution or rollback. Retained write operations still preserve partial outcomes and classify lost acknowledgements as unknown; no automatic ambiguous mutation retry or audit bypass is permitted. Role/assignment revisions and persistent session/audit/recovery mechanisms are unchanged.

### 11.4 Acceptance and Audit Handoff

**[NEW]** Apply section 9's acceptance suite to the active v1 scope. Required checks are:

1. **[NEW]** Reconcile the 41-ID/47-operation Gateway source fixture with exactly 40 active UI command IDs / 46 bindings and 49 permission literals. Assert all retained operations have permission/tier/audit tests and the existing 16 application routes remain covered.
2. **[NEW]** Assert no replay/re-drive UI, no M8 grant, no replay/workflow route, and zero replay dispatch for direct requests, including emergency users. Test backend rejection of each unsupported M1/M3/M4 selection with zero message scan calls; hiding controls alone is insufficient.
3. **[NEW]** Exercise valid one-partition explicit-offset M1/M3/M4 against dense, sparse/trailing-gap, nonmatching and skipped-record fixtures; assert bounds, exact large offsets, record order, encodings/headers, stop information, truthful incomplete/empty states, no automatic continuation, and no false snapshot/completion claim. Use appropriate real integration fixtures where fakes cannot model compaction.
4. **[NEW]** Keep V1-V20 traceability with FUNC-SPEC's v1 overlay: V15 checks exclusion, not passing replay execution. Defer adapter-specific ordering/aggregation, deduplication, retained-result, stop/expiry and workflow-memory tests alongside the absent feature. Keep cancellation/buffer cleanup and retained-mutation partial/unknown/audit-failure tests.
5. **[NEW]** Keep both database-provider suites, browser/security coverage, isolated integrations, maintenance/deployment acceptance, dependency/tool pins, benchmarks and all-severity zero-CVE release evidence. Deferred features do not weaken retained-operation safeguards or the prohibition on Gateway changes.

**[NEW]** B1/B2 are deferred-feature blockers, not fixed or verified. V1 no longer depends on the adapter proof or the unfinished section 8 workflow contracts. Pipeline Step 8 status remains BLOCKED pending the reduced-v1 full review and separate approved READY sign-off; release verification remains PENDING. This approval runs documentation checks only, not a new adapter/application/integration test or security scan, and does not authorize task creation or implementation.