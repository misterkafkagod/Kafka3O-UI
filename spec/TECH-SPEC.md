# Technical Specification

**Product:** Kafka3O-UI
**Version:** 0.18
**Date:** 2026-09-26
**Status:** Technology, design-pattern, SOLID, testing-strategy, and topology baselines approved by the user; test-tool version pins, compatibility, and release security verification pending.
**Pipeline:** Steps 3 through 9 completed: Spec Audit `STATUS: READY` (sections 15-16) and approved task plan [TASKS.md](TASKS.md). Executable test definitions (Step 10) and implementation remain pending.
**Functional baseline:** [FUNC-SPEC.md](FUNC-SPEC.md), revision 0.7.
**Contract addendum:** [CONSOLIDATED-PROPOSAL.md](CONSOLIDATED-PROPOSAL.md), revision 0.7, approved under sections 12-14. Section 13's reduced-v1 scope supersedes the earlier v1-wide B1/B2/workflow requirements; those features remain deferred, not proven compatible.
**UX baseline:** [DESIGN-SPEC.md](DESIGN-SPEC.md), revision 0.9, approved under section 14.

**Current release precedence:** Sections 13 and 14 control earlier all-operation, replay, continuation, permission-count and B1/B2 handoff statements throughout this technical specification; superseded wording has been removed from this text and remains in version control history. V1 has 40 active command IDs / 46 operations / 49 permission literals. The Gateway source catalog is unchanged at 41 / 47. Design status is recorded by the latest Spec Audit at the end of this document; release verification remains PENDING.

## 1. Technology Stack

### 1.1 Classification and Approved Constraints

Kafka3O-UI is an open-source project deployed on Kubernetes. Frontend and backend are delivered as one application. The browser communicates only with the UI backend; Kafka management uses configured Kafka3O-Gateway HTTP interfaces exclusively. No direct Kafka client is required.

Known-vulnerability tolerance is zero at every severity. Approval of this specification is not security clearance or permission to waive the release gates in section 1.6. Incomplete or unavailable vulnerability evidence is not a clean result.

### 1.2 Selected Components

The following are approved baseline version selections, not an executed dependency lock or a tested bill of materials. Any required updates must retain the compatibility and security gates below.

| Layer | Approved selection | Purpose and rationale |
|---|---|---|
| Language and build | C# with.NET SDK **10.0.401**, targeting `net10.0` | One language and build ecosystem for backend and frontend. Pin the SDK for reproducible builds. |
| Backend |.NET runtime and ASP.NET Core **10.0.12** | HTTP API, authentication, authorization, validation, Gateway HTTP clients, and static frontend hosting. |
| Frontend | Blazor WebAssembly **10.0.12**, served by the backend | Browser UI in C# without requiring a persistent server-side UI connection. The browser is never an authorization authority. |
| Persistence | Entity Framework Core **10.0.12** | Persist roles, assignments, sessions, and audit records with provider-specific migrations and equivalent functional behavior. |
| SQLite provider | `Microsoft.EntityFrameworkCore.Sqlite` and `Microsoft.Data.Sqlite` **10.0.12** | Embedded storage option for small, single-replica deployments. |
| SQLite native packaging | `SQLitePCLRaw.bundle_e_sqlite3` **3.0.5** and native `SQLite` package **3.53.4** | Explicit native-engine selection; the EF provider version alone does not identify or clear the native SQLite library. |
| External database | PostgreSQL **18.6** | Supported external storage option, recommended for production with one application replica in the first release. Other external database products are not selected. |
| PostgreSQL access | `Npgsql.EntityFrameworkCore.PostgreSQL` **10.0.3** and `Npgsql` **10.0.3** | EF provider and database driver. The provider's declared EF range includes 10.0.12. |
| Authentication | ASP.NET Core OIDC and cookie authentication, aligned with **10.0.12** | Separate Entra ID and Cognito schemes; server-side authorization-code exchange with PKCE and server-side sessions. |
| Packaging | One Linux application container and a Helm chart for Kubernetes | Backend serves the published WebAssembly assets. No separate Node.js runtime, Redis service, or identity server is required. |

Microsoft packages selected for these layers must align to 10.0.12 where applicable, including `Microsoft.AspNetCore.Authentication.OpenIdConnect`, `Microsoft.AspNetCore.Components.WebAssembly`, and `Microsoft.AspNetCore.Components.WebAssembly.Server`. Complete transitive pins are produced and audited during implementation; package version ranges must not substitute for a resolved lockfile.

Container distribution, image tags and immutable digests, Helm tool version, and supported Kubernetes versions remain unselected. Do not invent image digests or claim a tested deployment matrix. Resolve and validate them before release; the SDK belongs in the build stage, not the application runtime image.

### 1.3 Storage and Deployment Constraints

- SQLite mode permits one application replica with durable persistent storage. Deployment upgrades must not introduce overlapping application replicas against the same SQLite file. Multi-node shared-file SQLite is not a supported scale-out design.
- PostgreSQL mode permits exactly one application replica in the first release, with non-overlapping application upgrades. Both SQLite and PostgreSQL remain supported. Multi-replica deployment is deferred to a separately approved capability requiring shared-session, revocation, authorization-freshness, throttling, and key-management design and tests. Restart persistence remains required in either database mode; one replica does not imply high availability.
- Both database modes must pass the functional persistence, expiry, role-change, audit-gate, retention, and restart requirements. Provider-specific schema and migration differences must be handled explicitly.
- Gateway registrations and secret references remain deployment configuration. Neither database mode introduces runtime Gateway registry editing.
- Gateway credentials, OIDC tokens, and password material remain backend-only. Both OIDC providers coexist; the single emergency account retains the same audit and Gateway safeguards as specified in the functional baseline.
- Sessions default to **4 hours idle** and **8 hours absolute**, with passive polling excluded from indefinite idle renewal. Cookie middleware defaults alone do not establish compliance; enforce and test server-side expiry and revocation.

### 1.4 Support and Licensing

| Component | Support policy and license evidence |
|---|---|
|.NET / ASP.NET Core / Blazor 10 |.NET 10 is LTS, supported through **2028-11-14**, subject to vendor servicing requirements. Microsoft framework packages use MIT licensing. |
| EF Core 10 | Follow Microsoft's EF Core servicing and support policy alongside the selected.NET generation; MIT licensing. |
| PostgreSQL 18 | Five-year major-version support through **2030-11-14**, with minor updates required. This is not a separate LTS release channel. PostgreSQL license. |
| Npgsql | Maintainer-supported stable packages, without an equivalent formal.NET LTS guarantee. PostgreSQL license. |
| SQLite | Maintained stable engine, not a per-release LTS channel. The native package's license page declares SQLite public domain. |
| SQLitePCLRaw | Maintainer-supported wrapper/bundle, without a formal LTS guarantee. Apache-2.0 licensing. |

The non-LTS support-policy distinctions above are explicitly accepted for this baseline. SQLite's long-term project support intent does not guarantee maintenance of an individual pinned release. No paid SQLite encryption extension or paid support subscription is selected. License and notice review must cover the final transitive dependency graph and container packages, not just this table.

### 1.5 Compatibility and Advisory Review

Review status: preliminary upstream release, package-metadata, and advisory review only. No application restore, build, database integration test, full dependency vulnerability scan, or container scan has been executed. No component is certified free of all known vulnerabilities by this document.

| Area | Evidence and remaining limitation |
|---|---|
| Microsoft stack | Retrieved.NET 10.0.12 release notes identify SDK 10.0.401 and security fixes. Release notes and support status are not a complete vulnerability verdict for a resolved application. |
| Npgsql compatibility | Provider 10.0.3 declares EF Core `>= 10.0.4 && < 11.0.0` and Npgsql `>= 10.0.3`. EF Core 10.0.12 satisfies that range; this is metadata compatibility, not an executed test. |
| Npgsql advisory | `CVE-2024-32655` / `GHSA-x9vc-6hfv-hg8c` is a High-severity protocol-message-size overflow SQL injection issue. Candidate driver 10.0.3 is outside its listed affected ranges. That single advisory does not clear other or transitive dependencies. |
| PostgreSQL | The reviewed security table lists fixes included in 18.6. Recheck all applicable advisories against the actual deployed database build, including externally operated instances. |
| SQLite packaging | Bundle 3.0.5 declares `SQLite >= 3.53.4` and `SQLitePCLRaw.config.e_sqlite3 >= 3.0.5`; the configuration package references the platform provider. The native SQLite package identifies engine version 3.53.4. Resolve and audit the complete managed/native graph and verify the loaded engine in the target Linux image. |
| SQLite advisories | The reviewed upstream table identifies `CVE-2026-11822` and `CVE-2026-11824` as fixed in 3.53.2, preceding the selected 3.53.4 engine. Upstream applicability commentary is not an automatic exception to the zero-tolerance policy. |
| Container and remaining dependencies | Not audited. No image digest or complete dependency inventory exists yet. Security verification remains pending and release-blocking. |

### 1.6 Mandatory Verification and Release Gates

1. Pin and restore the full dependency graph, including native SQLite assets and build/test tooling. Preserve the resolved lockfiles and generate an SBOM for the delivered application/image.
2. Build and test the selected SDK/runtime/packages together. Verify SQLite engine identity inside the target container, provider loading, and migration/persistence behavior on SQLite and PostgreSQL. Reject incompatible combinations rather than assuming NuGet version-range compatibility is sufficient.
3. Scan direct, transitive, native, and container/OS dependencies against current vulnerability data. Include build dependencies and the deployed database version. Preserve scanner version, database freshness, timestamp, component versions, artifact digest, and findings as evidence.
4. Block release for known vulnerabilities at every severity, including vulnerabilities without available fixes. Unclassified findings require resolution before release. Missing, stale, failed, or incomplete audit results block release; a scanner's lack of native-library coverage must not silently pass SQLite.
5. Select supported Linux base images, scan the actual built images, and pin immutable digests. Scan each published platform variant. Verify the Helm deployment against an explicitly documented supported Kubernetes matrix.
6. Recheck advisories and rebuild/rescan after dependency or base-image changes and before each release. New findings require remediation and repeat validation; this baseline is not permanent security clearance.
7. Keep test environments isolated: only explicitly designated integration tests may contact real Gateways. Normal backend/component/browser tests use recording HTTP fakes and mock OIDC providers. No tests have been executed as part of stack selection.

### 1.7 Evidence Sources

Upstream pages reviewed during technology selection; these are evidence sources, not substitutes for artifact scans:

- [.NET support policy](https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core)
- [.NET 10.0.12 release notes](https://github.com/dotnet/core/blob/main/release-notes/10.0/10.0.12/10.0.12.md)
- [EF Core support policy](https://learn.microsoft.com/en-us/ef/core/what-is-new/)
- [EF Core SQLite 10.0.12 dependencies](https://www.nuget.org/packages/Microsoft.EntityFrameworkCore.Sqlite/10.0.12#dependencies-body-tab)
- [Npgsql EF provider 10.0.3 dependencies](https://www.nuget.org/packages/Npgsql.EntityFrameworkCore.PostgreSQL/10.0.3#dependencies-body-tab)
- [Npgsql security advisory](https://github.com/npgsql/npgsql/security/advisories/GHSA-x9vc-6hfv-hg8c)
- [PostgreSQL versioning policy](https://www.postgresql.org/support/versioning/) and [security advisories](https://www.postgresql.org/support/security/)
- [SQLitePCLRaw bundle 3.0.5 dependencies](https://www.nuget.org/packages/SQLitePCLRaw.bundle_e_sqlite3/3.0.5#dependencies-body-tab)
- [SQLitePCLRaw configuration 3.0.5 dependencies](https://www.nuget.org/packages/SQLitePCLRaw.config.e_sqlite3/3.0.5#dependencies-body-tab)
- [SQLite native package 3.53.4](https://www.nuget.org/packages/SQLite/3.53.4) and [license](https://www.nuget.org/packages/SQLite/3.53.4/License)
- [SQLite release history](https://sqlite.org/changes.html), [CVE status](https://sqlite.org/cves.html), and [long-term support statement](https://www.sqlite.org/lts.html)

### 1.8 Handoff and Revision History

Subsequent design must define application boundaries, concrete browser/backend contracts, migrations, server-side session storage, Data Protection key management, password hashing, audit durability/recovery, polling/deadlines, configuration rotation, and test tooling. This stack decision does not resolve Gateway contract ambiguities or expand functional scope.

| Version | Date | Change |
|---|---|---|
| 0.1 | 2026-09-22 | User-approved open-source .NET/Blazor/EF Core baseline, SQLite/PostgreSQL options, Kubernetes packaging, support-policy distinctions, preliminary advisory evidence, and mandatory pending verification gates. |
| 0.2 | 2026-09-22 | Appended the user-approved Step 4 minimalist architecture and design patterns, source-based extensibility, internal feature modules, implementation rules, exclusions, and verification criteria. Stack selections and security gates unchanged. |
| 0.3 | 2026-09-22 | Appended the user-approved Step 5 SOLID constraints, illustrative code-level examples, and verification requirements. Stack selections, functional scope, and security gates unchanged. |
| 0.4 | 2026-09-22 | Appended the user-approved Step 6 testing strategy, framework selections, coverage floors, V1-V20 traceability, execution gates, and performance-baseline approach. Exact test-tool pins and compatibility/security validation remain pending. |
| 0.5 | 2026-09-24 | Appended the user-approved Step 7 feature-first topology, three production projects, dependency boundaries, test alignment, and configuration/deployment locations. No application scaffolding; outstanding design and verification gates unchanged. |
| 0.6 | 2026-09-24 | Recorded approved audit remediation direction: separate design readiness from release verification, restrict the first release to one application replica with either database, and authorize proposals and read-only Gateway contract investigation. No readiness sign-off or security clearance. |
| 0.7 | 2026-09-24 | Recorded approved security/persistence design, API and operational direction, and Gateway count/health-route compatibility decisions. Detailed contracts and upstream continuation/dry-run compatibility remain blocked; no application tests or security clearance. |
| 0.8 | 2026-09-25 | Recorded the first approved detailed contract batch: unchanged Gateway constraint, compatibility investigation, fixed permission IDs, application routes, storage fields, session activity/cookies, errors, deadlines, polling, uploads, and maintenance recovery. Remaining design blockers and release gates retained. |
| 0.9 | 2026-09-25 | Recorded six approved refinements: explicit mirrored cluster routes, separate audit-result failure metadata, session identifier hashing and antiforgery header, emergency throttling schedule/concurrency, controlled key initialization/rotation, and post-restore session/access reconciliation. No readiness sign-off or Gateway modifications. |
| 0.10 | 2026-09-25 | Recorded six approved contracts for response metadata, revision preconditions, application-list pagination, throttle admission/window behavior, atomic session-expiry boundaries, and provider-specific OIDC callbacks. Gateway unchanged; remaining design and release gates retained. |
| 0.11 | 2026-09-25 | Recorded conditional T2 discovery authorization, export headers/finalization and byte limit, error outcomes, exact revision-header rejection rules, cross-provider persistence conventions, and scheduled audit retention. Snapshot continuation remains unproven; Gateway unchanged. |
| 0.16 | 2026-09-26 | Recorded approved reduced-v1 scope and addendum 0.6: 40 active command IDs / 46 operations / 49 permissions, one-shot explicit-offset single-partition M1/M3/M4, deferred M8 and message workflows, revised acceptance and B1/B2 classification. Repaired the damaged section 7.7 heading. Approvals for intervening revisions remain recorded in section 12; no READY or release sign-off. |
| 0.17 | 2026-09-26 | Recorded approved Step 8 remediation (section 14): struck superseded replay/continuation/47-operation text; per-call unavailable-operation classification without runtime OpenAPI discovery; deployment configuration schema; approved DESIGN-SPEC UX baseline and browser routes; audit operation vocabulary and target allowlist; v1 error envelope without `progress`; instance/maintenance locks; security headers; internal metrics endpoint. |
| 0.18 | 2026-09-26 | Recorded Step 9 clarifications S1-S5 and audit addendum (section 16); consumed diff markup cleaned after task creation. |

Future stack revisions preserve superseded definitions with `~~strikethrough~~` and prefix replacement choices with `**[NEW]**`.

## 2. Design Patterns

### 2.1 Approved Extensibility and Macro-Architecture

New workflows and integrations are added through source changes and rebuilds. Features remain internal modules released together; runtime third-party plugins and independently versioned modules are not required.

Use a modular monolith: one ASP.NET Core backend serves the Blazor WebAssembly frontend, packaged as the single application defined in section 1. Internal modularity does not introduce separate services or deployments. Both database modes require one application replica and non-overlapping upgrades in the first release; PostgreSQL scale-out is deferred as specified in section 1.3.

### 2.2 Essential Boundaries and Justification

| Choice | Concrete problem solved | Simpler alternative and why it is insufficient |
|---|---|---|
| Backend-for-frontend boundary | Keeps Gateway credentials, OIDC token handling, authorization, and audit enforcement server-side. This is an existing functional requirement, not an additional service. | Direct browser-to-Gateway calls expose credentials and cannot provide the required trusted user-level enforcement. |
| Internal feature modules | Separates identity/access, Kafka operation workflows, and audit functionality while retaining one release unit. Folders and namespaces suffice initially; a separate project per feature is not required. | One undifferentiated module would mix security rules and 46 active command-operation workflows, making ownership and review harder. |
| Built-in dependency injection with narrow external adapters | Makes Gateway transport, persistence, and time replaceable for deterministic tests and failure injection, and centralizes upstream protocol handling. Use framework facilities where they suffice. | Hard-wired external dependencies prevent fake-only normal tests and reliable failure simulation. An interface for every class would add no corresponding value. |

### 2.3 Workflow and Integration Rules

- Implement workflows as ordinary application-service methods. Share session, authorization, validation, and audit enforcement through direct calls to focused services; no custom pipeline or workflow engine is required.
- Every Gateway call, including destructive previews, downloads, and bulk requests, independently checks the session, operation permission, configured cluster, inputs, and applicable audit requirements. Browser visibility is never enforcement, and HTTP verb alone does not classify mutations.
- Mutations and lock overrides persist `ATTEMPT` before forwarding and `RESULT` afterward. Audit-attempt failure prevents execution; result-persistence failure after execution never triggers a retry or a rollback claim. Role/assignment changes retain the same fail-closed audit requirement. Other audit obligations, including emergency-account reads and destructive previews, remain governed by the functional specification.
- Place Gateway HTTP details in a typed client: configured destination resolution, appropriate credential tier, safe path encoding, numeric-safe serialization, correlation IDs, and error translation. Credentials are selected only after authorization. Do not expose an arbitrary proxy endpoint or accept browser-supplied upstream URLs or authorization headers.
- Preserve Gateway confirmation tokens, safety controls, reported scan information, and per-item outcomes. Do not automatically retry ambiguous mutations. No replay workflow or durable background job exists in v1.
- Identity/access owns authentication and effective permission evaluation; Kafka application services own operation orchestration; audit functionality owns recording and authorized history access. These responsibilities communicate through in-process calls, not a message bus.

### 2.4 Persistence and Browser State

- Use EF Core directly within persistence implementations. Introduce only focused storage interfaces needed by application behavior and test isolation; do not add a generic repository or an extra unit-of-work layer over EF Core.
- Choose SQLite or PostgreSQL through EF provider configuration at startup. Handle provider-specific migrations explicitly; do not create a custom database strategy framework. Both modes must retain equivalent functional persistence semantics.
- Keep browser state within components or feature-scoped services. Bind drafts, previews, and results to the selected cluster; switching clusters invalidates incompatible state and prevents late responses from appearing as the new cluster's data.
- Browser state contains no Gateway credentials, OIDC tokens, or persisted password material. It cannot replace backend session validation or permission checks. No separate global state-management framework is selected.

### 2.5 Deliberately Excluded Patterns

Do not introduce microservices, runtime plugins, a mediator library, a CQRS framework, event sourcing, a message bus, or a custom workflow engine. The approved workflows require neither independently deployed features nor asynchronous command infrastructure. Ordinary methods, framework services, and narrow adapters provide the required organization and testability with fewer abstractions.

Audit history is an accountability record, not an event-sourced application model. It does not reconstruct application state or authorize automatic replay of mutations. New abstractions require a concrete demonstrated need and must not silently expand the approved scope.

### 2.6 Verification and Handoff

The following are required implementation checks, not tests executed during this documentation step:

| Check | Required evidence and functional traceability |
|---|---|
| Enforcement cannot be bypassed | Recording Gateway fakes observe zero target-operation calls on session/permission denial or required audit-attempt failure, including previews, and zero replay calls for deferred routes; role changes do not execute on audit-attempt failure. Covers V4-V6, V10, V15, and V17. |
| Dependency isolation | Normal tests use recording HTTP fakes, mock OIDC issuers, controlled clocks, and appropriate storage substitutes. Only explicitly designated integration tests contact real Gateways. Covers D9, V8, and V19. |
| Persistence equivalence | SQLite and PostgreSQL pass equivalent session, role, audit, retention, and restart checks; fake tests do not substitute for provider integration evidence. Covers O7 and V18. |
| Mutation outcome safety | Inject ambiguous transport failure and post-execution audit failure; observe no automatic retry, duplicate execution, or rollback claim. Covers V14, V17, and V20. |
| Browser boundary | Browser tests verify secret isolation, cluster-bound state invalidation, and rejection of late responses for a previous cluster. Covers V9 and V16. |

Subsequent steps define concrete service contracts, schemas, dependency lifetimes, session/key storage, audit durability, and executable tests. Section 1 version selections, pending compatibility evidence, and all-severity security gates remain unchanged. No application code or new dependency is introduced by this section.

Future pattern revisions preserve superseded definitions with `~~strikethrough~~` and prefix replacement choices with `**[NEW]**`.

## 3. SOLID Constraints

These constraints apply within the approved modular monolith and do not require an interface for every class. Names in the examples are illustrative, not finalized APIs or implemented symbols.

### 3.1 Single Responsibility

Endpoints handle HTTP binding and responses; application services coordinate workflows; authorization, audit persistence, and Gateway transport remain separate responsibilities. Blazor components must not implement trusted authorization or persistence.

Code-level example: `TopicService.DeleteTopicAsync(...)` coordinates permission checks, audit recording, and a typed Gateway call without containing SQL or rendering logic.

### 3.2 Open/Closed

Add operations through feature methods, explicit operation metadata, and tests while reusing shared enforcement. New operations must not require operation-specific branches inside session validation or audit persistence. Ordinary source changes, including catalog, route, UI, and registration changes, remain allowed; no plugin framework is introduced. Every new operation retains the session, authorization, validation, and audit requirements in section 2.3.

Code-level example: Adding a topic operation adds its permission/audit classification and workflow method while leaving `SessionValidator` and `AuditWriter` unchanged.

### 3.3 Liskov Substitution

Implementations of the same contract must preserve inputs, outcomes, failure semantics, cancellation semantics, and security guarantees. SQLite and PostgreSQL must satisfy the same application-level storage contracts, without requiring identical provider internals. Recording fakes must model relevant failures rather than always returning success; fake behavior does not establish production durability or replace provider integration tests.

Code-level example: Every production `IAuditWriter.RecordAttemptAsync(...)` implementation returns success only after durable persistence, and an injected failing fake causes zero mutation calls.

### 3.4 Interface Segregation

Define interfaces around actual consumer needs, not the complete application or Gateway catalog. Separate audit recording from audit querying and expose focused Gateway capabilities where needed. Storage interfaces must not leak `DbContext`, `DbSet`, or `IQueryable`; EF Core remains usable directly within persistence implementations as specified in section 2.4.

Code-level example: A mutation service depends on `IAuditWriter`, while the audit-history feature depends on `IAuditReader`, without either receiving unused methods.

### 3.5 Dependency Inversion

Application workflows receive external capabilities through constructor injection using ASP.NET Core DI. Inject focused storage/Gateway contracts and.NET `TimeProvider`; keep EF Core and HTTP implementations behind those boundaries. Do not use a service locator or static mutable dependencies, and do not reference backend infrastructure from Blazor.

Code-level example: `SessionValidator(ISessionStore sessions, TimeProvider clock)` supports controlled-clock tests without constructing a database context or reading `DateTime.UtcNow` directly.

### 3.6 Verification and Handoff

Code review and dependency checks must enforce responsibility boundaries, consumer-focused interfaces, and the prohibition on browser references to backend infrastructure. Require focused tests for authorization/audit failures, expiry, adapter contracts, and equivalent SQLite/PostgreSQL behavior, retaining the failure and restart checks in section 2.6. These are implementation requirements, not tests executed during this documentation step.

No new framework, generic repository, or inheritance hierarchy is required. Concrete contracts and executable test tooling remain subsequent design work. Functional scope, stack selections, and pending compatibility and security release gates remain unchanged; no application code or dependency is introduced by this section.

Future SOLID revisions preserve superseded definitions with `~~strikethrough~~` and prefix replacement rules with `**[NEW]**`.

## 4. Testing Strategy

### 4.1 Approved Approach and Frameworks

Use risk-based coverage with numeric floors, database integration on pull requests, real Gateway tests nightly and before release, and repeatable performance baselines before setting numeric limits. No fixed unit/integration/end-to-end ratio is imposed: test logic at the cheapest effective layer and use browsers for actual user interactions and browser security behavior.

| Purpose | Approved selection and boundary |
|---|---|
| Unit and workflow tests | xUnit v3 with built-in assertions; focused storage substitutes, recording Gateway fakes, and controlled `TimeProvider` clocks. |
| Backend API tests | ASP.NET Core `WebApplicationFactory` with recording Gateway HTTP fakes and mock OIDC issuers, retaining the application middleware and enforcement paths under test. |
| Blazor component tests | bUnit for component rendering, interactions, and feature-state behavior. |
| Browser tests | Playwright for.NET against the running application; normal browser suites use fake Gateways and mock OIDC issuers. |
| Database integration | Temporary SQLite files and disposable PostgreSQL via Testcontainers for.NET, using the selected database/provider baseline. |
| Coverage | Coverlet collector with the xUnit VSTest adapter; validate discovery, execution, and line/branch collection together on the approved.NET 10 baseline. |

Exact package versions remain unpinned. Before freezing versions, validate the runner, adapter, coverage collector, bUnit, API host, and browser tooling together with SDK 10.0.401 and the selected.NET 10.0.12 packages. Retain resolved dependency pins and evidence; framework selection is not proof of compatibility. Test tools, browser binaries, and disposable dependency images remain subject to the licensing and zero-CVE gates in section 1. No tooling has been installed or validated by this documentation step.

### 4.2 Coverage and Contract Traceability

- Enforce minimum **90% line coverage** and **85% branch coverage** for backend authorization, session, validation, audit orchestration, and operation-workflow logic. Define the included code scope explicitly in the executable coverage configuration.
- Security-critical allow/deny and failure paths require explicit tests regardless of percentages. Generated code and migrations may be excluded from percentage calculations, but migrations still require database integration tests.
- Maintain traceability for V1-V20 and the 40 active command IDs / 46 operations in the functional baseline. Each active operation has a UI workflow, input/output contract assertions, and an authorization test, keyed by command ID and sub-operation identifier; M8 absence is asserted separately.
- Validate method/path and command metadata against the pinned Gateway OpenAPI fixture, using the approved 41-command/47-operation source count and health-path exceptions in section 7.6 and the 46-operation v1 projection. Retain the upstream documentation discrepancy as evidence, not an unresolved UI count decision. Do not invent a route or treat unsupported prerequisites as coverage success.

### 4.3 Functional and State-Transition Verification

| Functional surface | Verification IDs | Required tests |
|---|---|---|
| Authentication and sessions | V2, V3, V4, V5, V6, V7 | Both mock OIDC providers in one deployment; invalid protocol inputs; issuer/subject identity separation; permission unions; emergency login and audit; CSRF; controlled-clock 4-hour idle and 8-hour absolute expiry; passive polling, logout, rotation, and revocation. |
| Authorization and audit gates | V4, V5, V17 | Permission/session denial or required audit-attempt failure produces zero target-operation calls; role changes also fail closed. Role/mapping changes affect the next request. |
| Gateway contracts and isolation | V1, V8, V11, V19 | Method/path, credential tier, request/response schemas, correlation, safety errors, unavailable operations, independent cluster failures, and IdP outage isolation. Cover health and OpenAPI authentication as well as command calls. |
| Preview and confirmation | V10, V16 | Target/input changes invalidate previews; stale plans require renewed confirmation; dry-runs cause zero mutations; cluster switching rejects late results and invalidates plans and results; deep links reauthorize access. |
| Reads, uploads, and data integrity | V9, V12, V13, V14 | Exact large offsets, encodings, repeated/binary headers, timestamps, bounds, single-partition explicit-offset scans, unsupported-selection rejection with zero scan calls, missing offsets, invalid regex/JSONPath, malformed/oversized uploads, validate-all failures, 207 outcomes, secret isolation, security headers, safe destinations/redirects, and non-executable message content. |
| Deferred-feature absence and post-execution failures | V15, V17 | No replay/workflow route, M8 permission, or replay dispatch exists, including for the emergency identity. Ambiguous transport failures and result-audit failures on retained mutations never trigger automatic retry, duplicate execution, or a rollback claim. |
| Persistence and retention | V18 | Equivalent migrations, sessions, roles, retention, audit, and restart behavior on both real database providers; fakes do not establish durability or replace provider integration evidence. |
| Browser states and audit access | V20 | Loading, empty, denied, unavailable, success, partial success, failed, and outcome-unknown states; permission-checked audit-history access. |

Cross-check tests against every decision branch in the functional specification's section 3.4 Mermaid workflow: SSO/emergency authentication, allowed/denied authorization, destructive/non-destructive preparation, mutation/override classification, and audit-attempt success/failure. Exercise the accompanying operation lifecycle from `idle` through validation, preview, confirmation, execution, and each terminal state, including permission/session loss before execution. Each preview and execution call is independently enforced.

Recording HTTP fakes verify outgoing request ordering, counts, destinations, credentials, headers, and payloads. Controlled responses simulate upstream errors, delayed responses, cancellation, and post-send uncertainty; mock OIDC issuers expose discovery, authorization, token, and signing-key behavior needed for both valid and invalid protocol flows. No external REST interaction is exempt from isolation and failure injection. Real-provider tests establish persistence guarantees that fakes cannot prove.

### 4.4 Execution Gates and Environment Isolation

| Trigger | Required suites |
|---|---|
| Pull requests | Unit, backend API, component, contract, SQLite/PostgreSQL integration, coverage floors, and Chromium critical-path browser tests. |
| Nightly and before release | Broader Chromium, Firefox, and WebKit browser coverage, plus isolated real Gateway/Kafka integration tests across at least two configured Gateway registrations in different environments. |
| Separately configured, opt-in | Real identity-provider integration checks; normal suites continue to use mock OIDC issuers. |

- Only explicitly designated integration tests contact real Gateways. Cover implemented operations and observable Kafka effects, both credential tiers, safety configurations, and compatible Kafka versions using explicitly allowlisted disposable test resources. Setup, destructive actions, and cleanup must never target production.
- Normal suites reject unexpected external traffic; only local test hosts and explicitly configured disposable dependencies are allowed. Database integration remains separately identifiable even when run in the pull-request gate. Container-based suites require an available compatible container runtime; absence is not a passing result.
- Missing prerequisites are reported as **skipped/not verified**, never passed. Missing required release evidence blocks release, including unavailable required Gateway coverage. Retain suite results, coverage reports, tested versions, and sanitized diagnostics so failures and unverified requirements remain visible.
- Inspect rendered content, browser storage, network responses, diagnostics, and audit records with synthetic sentinel secrets. Browser traces, logs, and fixtures must not expose credentials or sensitive payloads; use synthetic test data and sanitize retained artifacts.

### 4.5 Performance Baselines

Measure API latency, browser workflow timing, throughput, errors, CPU, and memory under documented concurrency, using controlled Gateway responses and both database modes. Separate application overhead from real Gateway/Kafka latency. Retain reproducible workload definitions, dataset sizes, environment/resource details, and results.

Workload sizes, expected users/clusters, numeric latency/error limits, and resource budgets require later agreement before numeric performance release gates are enforced. No load-generator framework or numeric performance claim is selected by this baseline. Functional bounds, timeout, cancellation, and dependency-isolation checks remain required regardless of performance thresholds.

### 4.6 Verification Status and Handoff

This section records the approved testing design, not executed application tests or measured coverage. Subsequent work must pin and validate test tools, define executable suites and CI configuration, provision isolated integration resources, and agree on performance workloads and limits. No application code, installed dependency, or test result is introduced here. Functional scope, application stack selections, and all compatibility/security release gates remain unchanged.

Future testing revisions preserve superseded definitions with `~~strikethrough~~` and prefix replacement choices with `**[NEW]**`.

## 5. System Topology & File Structure

### 5.1 Repository Boundary and Layout

Keep backend, frontend, tests, and deployment assets in Kafka3O-UI with one solution and a feature-first folder layout. Kafka3O-Gateway remains a separate repository and deployment dependency; UI builds must not require a sibling Gateway checkout or copied Gateway implementation source. Retain the modular monolith and one application image, with no project per feature or separate Application/Infrastructure production projects.

The following is the approved target tree, not an existing scaffold. Only `LICENSE` and the current specification files under `spec/` exist at this stage. Create implementation files as their approved tasks require them; the tree does not finalize method signatures, database schemas, or public API contracts.

```text
Kafka3O-UI/
|-- Kafka3O.UI.slnx
|-- global.json
|-- Directory.Build.props
|-- Directory.Packages.props
|-- src/
|   |-- Kafka3O.UI.Server/
|   |   |-- Kafka3O.UI.Server.csproj
|   |   |-- Program.cs
|   |   |-- appsettings.json
|   |   |-- Features/
|   |   |   |-- Identity/
|   |   |   |-- Access/
|   |   |   |-- Clusters/
|   |   |   |-- Topics/
|   |   |   |-- Messages/
|   |   |   |-- Groups/
|   |   |   |-- Security/
|   |   |   `-- Audit/
|   |   `-- Infrastructure/
|   |       |-- Gateway/
|   |       |-- Persistence/
|   |       |   |-- Configurations/
|   |       |   `-- Migrations/
|   |       |       |-- Sqlite/
|   |       |       `-- PostgreSql/
|   |       `-- Configuration/
|   |-- Kafka3O.UI.Client/
|   |   |-- Kafka3O.UI.Client.csproj
|   |   |-- Program.cs
|   |   |-- App.razor
|   |   |-- Layout/
|   |   |-- Features/
|   |   |-- Http/
|   |   `-- wwwroot/
|   `-- Kafka3O.UI.Contracts/
|       |-- Kafka3O.UI.Contracts.csproj
|       `-- Features/
|-- tests/
|   |-- Kafka3O.UI.Server.Tests/
|   |-- Kafka3O.UI.Client.Tests/
|   |-- Kafka3O.UI.Persistence.Tests/
|   |-- Kafka3O.UI.Browser.Tests/
|   |-- Kafka3O.UI.ExternalIntegration.Tests/
|   |-- Kafka3O.UI.TestSupport/
|   `-- Performance/
|-- deploy/
|   |-- Dockerfile
|   `-- helm/kafka3o-ui/
|-- config/
|-- scripts/
|-- spec/
`-- LICENSE
```

### 5.2 Production Ownership and Dependencies

| Component | Responsibility and allowed dependency direction |
|---|---|
| Server | ASP.NET Core host, trusted authentication/authorization, application workflows, audit enforcement, and infrastructure implementations. References Contracts; its publish process includes Client static assets, producing one application image. This asset-build relationship does not move trusted policy into the browser. |
| Client | Blazor WebAssembly shell, feature components/state, and same-origin UI backend clients under `Http/`. References Contracts, never Server, EF Core, Gateway transport, or backend secrets. `wwwroot/` contains public assets only. |
| Contracts | Deliberately browser-facing request/response DTOs grouped by feature. References neither Server nor Client; contains no database entities, upstream credential models, or trusted authorization implementations. |
| Server feature folders | Own endpoints, application services, policy logic, and narrow consumer-owned interfaces. `Identity/` owns OIDC/emergency authentication and sessions; `Access/` owns permissions, roles, and assignments; `Audit/` owns audit workflows and recording/query contracts. Kafka workflows live in `Clusters/`, `Topics/`, `Messages/`, `Groups/`, and `Security/`; Security here means Gateway SCRAM/quota operations, not application identity management. |
| Server infrastructure folders | Implement feature-owned Gateway/storage interfaces. `Gateway/` owns typed HTTP transport and upstream wire models; `Persistence/` owns EF configuration, storage implementations, and provider-specific migration sets; `Configuration/` owns registry, secret-reference resolution, and configuration validation. |

Server `Program.cs` is the composition root for dependency registration and hosting. Application workflows use direct calls to the focused services/interfaces defined in sections 2 and 3. Dependency checks enforce feature-policy versus infrastructure boundaries within the Server project; folders alone do not provide compile-time isolation. No generic repository, custom workflow engine, or interface-per-class rule is introduced.

Client `Features/` mirrors user-facing feature names and owns pages/components and feature-scoped state. Contracts `Features/` follows the same naming where browser-facing DTOs are required, without forcing identical file counts or creating unused feature abstractions.

Example target location: `src/Kafka3O.UI.Server/Features/Messages/MessageService.cs` coordinates the authorization, audit, selection validation, and Gateway call for M1-M7; its narrow interface dependencies remain feature-owned, while HTTP details stay under `Infrastructure/Gateway/`. This is a proposed file and responsibility, not an implemented symbol. No `ReplayService` is created in v1 (section 13.2).

### 5.3 Test Alignment

Each named test-suite directory contains its corresponding test project; `Kafka3O.UI.TestSupport` is shared test-only support, not a production dependency. Within suites, feature folders mirror implementation names so a workflow and its tests can be traced without searching unrelated layers.

| Location under `tests/` | Implementation alignment and approved tooling |
|---|---|
| `Kafka3O.UI.Server.Tests/` | Server feature policy/workflow tests, `WebApplicationFactory` API tests, Gateway contract tests, and dependency-boundary checks using xUnit. Mirror `Features/` and relevant `Infrastructure/` paths; retain command/sub-operation traceability for the 46 active operations plus the M8 absence check. |
| `Kafka3O.UI.Client.Tests/` | bUnit tests mirroring Client features, layouts, and feature-state behavior. |
| `Kafka3O.UI.Persistence.Tests/` | Equivalent storage/session/role/audit/retention/restart tests against temporary SQLite files and Testcontainers PostgreSQL, including both provider migration sets. |
| `Kafka3O.UI.Browser.Tests/` | Playwright for.NET against the running published application, organized by user workflow; normal suites use fake Gateways and mock OIDC issuers. |
| `Kafka3O.UI.ExternalIntegration.Tests/` | Explicitly selected real Gateway/Kafka and separately configured opt-in real IdP suites, with allowlisted disposable resources and visible missing-prerequisite results. |
| `Kafka3O.UI.TestSupport/` | Reusable recording HTTP fakes, mock OIDC issuers, and fixtures. Keep helpers local to their suite unless genuinely reused; production projects never reference this support project. |
| `Performance/` | Workload definitions and reproducible baseline procedures. No load-generator framework or additional production project is selected. |

The layout preserves section 4's execution gates: unit/API/component/contract/database and Chromium critical-path checks on pull requests; broader Chromium/Firefox/WebKit coverage and isolated real Gateway tests nightly and before release. Keep external suites separately selectable so a default test run cannot accidentally contact real Gateways or identity providers. Coverage floors, dependency isolation, and required release evidence remain unchanged.

### 5.4 Build, Configuration, and Deployment Locations

- `Kafka3O.UI.slnx` groups the production and test projects. `global.json` pins the approved SDK; `Directory.Build.props` holds common build settings and `Directory.Packages.props` centralizes approved package versions. Central version declarations do not replace resolved lockfiles or compatibility/security evidence.
- Server `appsettings.json` holds non-secret defaults; `config/` contains sanitized deployment/configuration examples with placeholders only. Registry and secret references remain configuration-managed, never browser-editable registry data. Database files, secrets, Data Protection keys, and generated test artifacts remain outside version control and outside public assets.
- `deploy/Dockerfile` packages the backend and published Client assets as one Linux application image. `deploy/helm/kafka3o-ui/` contains the chart, values, and templates for Kubernetes. Both database modes require exactly one application replica with non-overlapping upgrades in the first release; SQLite requires durable file storage and both modes must preserve state across restarts. Multi-replica support is deferred under section 1.3.
- `scripts/` provides build, test, and security entry points as implementation requires. `spec/` retains the functional/technical specifications and later task plan. Do not introduce sibling-repository build dependencies or embed production secrets in scripts, fixtures, images, or chart values.

### 5.5 Validation and Handoff

The topology maps the approved ASP.NET Core/Blazor stack, feature modules, narrow adapters, both persistence providers, and every section 4 test category to explicit locations. Implementation must verify project dependency direction, browser secret isolation, separate provider migration selection, isolated suite execution, and server publication of Client assets. A directory tree alone does not establish those guarantees.

This step updates documentation only: no application scaffold, dependency installation, build, or test run is performed. Exact service signatures, schemas, migration design-time configuration, session/key persistence, audit durability, test-tool pins, deployment versions, and other outstanding design details remain unresolved where previously identified. Topology approval is not a Step 8 `STATUS: READY` audit, compatibility certification, or security clearance. Functional scope and existing verification/release gates are unchanged.

Future topology revisions preserve superseded definitions with `~~strikethrough~~` and prefix replacement choices with `**[NEW]**`.

## 6. Approved Audit Remediation Direction

Decision date: 2026-09-24. These are approved remediation directions, not a completed audit sign-off. Release verification remains pending.

- Step 8 evaluates complete, consistent, deterministic implementation requirements and defined verification gates. Actual builds, compatibility tests, resolved dependency audits, and artifact/container scans remain mandatory before release under section 1.6. Their absence during specification work is pending evidence, never a clean result. This separation does not permit unresolved design decisions or known incompatibilities to pass design review.
- Zero tolerance for known vulnerabilities at every severity remains unchanged, including vulnerabilities without available fixes. Unscanned components must never be described as clean; design approval does not waive security or other release gates.
- Prepare a concrete proposal for sessions, password hashing, CSRF, login throttling, audit failures, persistence transactions, UI API contracts, migration rules, and operational behavior, preferring built-in.NET facilities and the selected databases. These concrete choices require user approval before becoming normative specification text.
- Inspect the current Gateway implementation, tests, and available OpenAPI read-only to resolve confirmation, continuation, and operation-count ambiguities. Do not modify Gateway files or invent behavior where implementation is missing or conflicts with its specification; report remaining upstream blockers explicitly.
- The first release supports SQLite and PostgreSQL with one application replica in either mode and non-overlapping upgrades, as reflected in sections 1.3, 2.1, and 5.4. Multi-replica deployment is a later, separately approved capability. Restart persistence and secure key management remain required now.

## 7. Approved Security, Persistence, and Compatibility Design

Approved on 2026-09-24. This section makes the approved remediation choices normative and refines earlier handoff notes for these subjects. It does not finalize the unresolved contracts listed in section 7.7 or grant readiness/release sign-off.

### 7.1 Sessions, Cookies, and CSRF

- Store opaque sessions in the selected database. Validate expiry, revocation, and current application roles on every request without a permissive authorization cache. Preserve provider claims as the verified login snapshot and apply local role/mapping changes on the next request.
- Explicit user actions renew idle activity; background polling does not. Keep the 4-hour idle and 8-hour absolute limits. Define the exact qualifying-activity classification and concurrent timestamp-update rules in the remaining session contract; do not treat every HTTP request as activity.
- Use ASP.NET Core cookie authentication and antiforgery validation. Application cookies are Secure and HttpOnly; configure OIDC correlation/nonce cookies for the callback flow. Require an antiforgery header on state-changing browser requests, including emergency login and logout. Define the pre-login antiforgery bootstrap and cookie/SameSite settings before implementation. OIDC callbacks retain their separate state/nonce/correlation validation; do not require a browser API antiforgery header from the identity provider.
- Never put authentication tokens in browser storage. A session/database failure must not fall back to anonymous execution or stale permissive authorization.

### 7.2 Emergency Credentials and Login Throttling

- Use ASP.NET Core Identity's password hasher without introducing additional local accounts or requiring a full Identity account-management subsystem. Select Identity V3 PBKDF2-HMAC-SHA512 with at least 210,000 iterations, subject to deployment benchmarking. Provision the hash through a secret; a credential-version change revokes existing local sessions. Benchmarking does not authorize reducing the approved minimum.
- Persist failed-attempt state across restarts. Apply a threshold of five failures per account/source-address pair in 15 minutes, followed by progressive delays capped at 60 seconds, plus a bounded global concurrency limit. Trust forwarded client addresses only from configured proxies; never permanently lock the account.
- The delay progression, counter reset/expiry behavior, global concurrency value, and overload response remain explicit design items for approval. This baseline does not claim that per-address limits alone prevent distributed guessing.

### 7.3 Key Persistence and Rotation

Persist Data Protection keys outside the container filesystem on protected durable storage, encrypted using a secret-provisioned certificate. Retain required old keys during rotation. Missing or unreadable key material prevents startup rather than silently creating an incompatible key ring. Define controlled first-install initialization, certificate/key rotation overlap, permissions, and restore procedures before implementation; first-install provisioning must be distinguishable from loss of an existing key ring.

### 7.4 Persistence and Audit Failure Semantics

Use tables for sessions, roles, role-permission membership, assignments, login throttling, and audit events, with provider-independent concurrency tokens and uniqueness constraints. Concurrent role edits return a conflict instead of silently overwriting changes. Exact columns, indexes, relationships, retention queries, and concurrency response schemas remain to be defined for both providers.

| Event or operation | Required persistence and failure behavior |
|---|---|
| External mutation | Commit audit `ATTEMPT` before forwarding. Failure prevents the Gateway call. Preserve the known operation result independently from any subsequent audit-persistence failure; never claim rollback or retry the mutation. |
| Role/assignment change | Commit the audit attempt first; then commit the local change and its successful `RESULT` atomically in one database transaction. Failure before commit must not leave a successful role change without its result record. |
| Emergency read, destructive preview, lock override | Require durable audit recording before executing/forwarding the action. Failure rejects it. These rules apply to each Gateway call, including overridden previews; the simplified functional Mermaid diagram does not bypass this gate. |
| Successful authentication | Require durable authentication auditing before issuing a session. Audit failure prevents successful login and session issuance. |
| Failed authentication or authorization denial | The request remains denied if logging fails; emit sanitized operational diagnostics without exposing credentials. Logging failure never turns a rejection into access. |
| Post-execution result recording | Attempt result persistence with a bounded deadline independent of request cancellation. Do not retry the business mutation. Keep any prior durable attempt and expose unresolved audit state if result persistence fails. |
| Crash with unmatched attempt | Retain and visibly classify the attempt as unresolved. Do not infer success, failure, or zero writes, and do not replay it automatically. |

Run provider-specific migrations explicitly while the application is stopped. Refuse startup against an incompatible schema; do not migrate automatically on ordinary startup. Define provider migration selection, transaction/recovery rules, and backup/restore procedures as part of the remaining persistence contract.

Tests must inject each failure in the matrix, verify zero prohibited Gateway calls/session issuance/local changes, and exercise result-write failure, cancellation, and crash recovery without duplicate mutation. Persistence and restart assertions run against both actual database providers, not only storage fakes.

### 7.5 UI API and Operational Direction

- Use explicit authenticated UI endpoints for sessions, roles, assignments, audit history, and cluster operations, with narrowly scoped unauthenticated authentication/bootstrap endpoints where needed. Never expose a generic caller-controlled proxy. Before task creation, define each operation's permission, credential tier, mutation classification, audit requirement, DTO, and error mapping in a contract table.
- Across the browser/backend boundary, serialize offsets and other precision-sensitive 64-bit integers as decimal strings. Parse and range-check strictly, converting to Gateway wire types only on the backend. Preserve null/encoding/header semantics; do not route these values through floating-point conversion.
- Configuration and secret changes are restart-only initially. Deploy with non-overlapping replacement and explicit downtime for either database. Persist sessions, authorization data, audit records, and key material across restarts; credential-version changes revoke local sessions as specified in section 7.2.
- Use a 5-second connection timeout and operation-specific overall deadlines that allow the configured scan/sample duration. Exact overall deadlines, polling intervals, request-size limits, and the bounded result-audit deadline remain to be specified. Do not introduce automatic retries of ambiguous mutations.
- Stop admitting work before shutdown. Allow bounded draining under a defined termination budget; unfinished mutations remain outcome-unknown, never automatically replayed. Define readiness/drain sequencing and the termination budget before implementation.

### 7.6 Gateway Compatibility Baseline

Adopt 41 command IDs across 47 command operations and health paths `/v1/health/live` and `/v1/health/ready`. The two documentation routes `/openapi.json` and `/docs` are additional, not command operations. These narrow compatibility decisions supersede contradictory count/health-path prose in the referenced upstream specification for the UI integration only; no Gateway files are changed.

Evidence is read-only source and checked-in snapshot inspection on 2026-09-24: Gateway `internal/api/testdata/openapi.golden.json` contains 47 operations and the prefixed health routes; `internal/api/openapi_test.go` asserts 41 IDs, 47 operations, and an empty pending-command list; `internal/api/api.go` registers the health paths. This is not a freshly served deployment contract or executed test result. Record the targeted Gateway revision/artifact and revalidate its served OpenAPI before release.

Observed dry-run behavior: `internal/service/core/destructive.go` builds a plan and returns a dry-run before confirmation comparison. The first-preview wire shape is resolved by section 12.1 (P6): explicit `confirm: ""` with `dryRun=true` on the 17 active confirmation-bearing operations; execution still requires the exact target or plan token.

Observed continuation shape: Gateway message requests accept one optional `partition` and `from`/`to` selectors but return per-partition cursors. Multi-partition continuation, stable end bounds, and aggregation are deferred with their features under section 13.2; v1 M1/M3/M4 send exactly one partition with explicit offsets and never reuse cursors. Do not invent a cursor-map request field.

### 7.7 Remaining Design Blockers and Verification Status

Release verification: `PENDING`. This records approval of the design direction, not a complete Step 8 sign-off or permission to start task creation.

Section 8 records the next approved contract batch and supersedes earlier pending-decision statements only for its explicitly selected values. Section 8.7 lists the remaining gaps.

No application tests, benchmarks, dependency compatibility checks, or artifact scans were run for this documentation change. Test-tool pins, deployment-version selections, and release evidence remain pending under sections 1 and 4. The all-severity zero-CVE policy remains unchanged; no unscanned component is certified clean.

## 8. Approved Detailed Contract Batch 1

Approved on 2026-09-25. The user rejected Gateway modifications, retained operation-level permissions, selected explicit-user-request session activity and stopped-application migrations with backup, then approved this first detailed proposal. This section refines section 7; it does not approve application implementation, task creation, the entire visual-design draft, or a readiness verdict. Unspecified contracts remain open rather than being inferred from examples.

### 8.1 Unchanged Gateway and Compatibility Investigation

- Kafka3O-Gateway remains unchanged. The later explicitly approved reduced-v1 scope (section 13) implements 40 command IDs / 46 operations and defers M8 and multi-partition message workflows; no further feature may be dropped without explicit approval.
- For first previews, investigate supplying `confirm: ""` with `dryRun=true` where the existing HTTP schema requires a confirmation string. Checked-in `ReplayRequestBody.confirm` has type string without a non-empty constraint, and the shared destructive service returns a dry-run before checking confirmation. These source observations support a candidate adapter request shape, not proof that every HTTP route accepts it. Require route-specific HTTP tests proving successful preview and zero mutations before treating compatibility as established. Execution still requires the real exact target or plan token; never reuse the empty preview value for execution.
- Multi-partition orchestration is deferred with its features under section 13.2; it is not investigated or built for v1.
- No Gateway code, schema, or tests are changed by this decision. Target deployment compatibility remains release evidence.

### 8.2 Fixed Permission Identifiers

The v1 catalog contains 46 literal Gateway operation permissions plus three separate permissions below (49 total); `gateway.m8` is deferred and excluded from v1 input, output, and storage. No wildcard grants or command-level parent grants are introduced for multi-operation commands. Roles remain user-created named bundles; environment/cluster assignment union and application-wide administration semantics remain as specified in FUNC-SPEC section 2.3.

| Family | Literal permission IDs |
|---|---|
| Cluster | `gateway.c1`, `gateway.c2`, `gateway.c3.live`, `gateway.c3.ready`, `gateway.c4`, `gateway.c5`, `gateway.c6`, `gateway.c7`, `gateway.c8`, `gateway.c9.start`, `gateway.c9.cancel`, `gateway.c9.elect`, `gateway.c10`, `gateway.c11`, `gateway.c12` |
| Topics | `gateway.t1`, `gateway.t2`, `gateway.t3`, `gateway.t4`, `gateway.t5`, `gateway.t6`, `gateway.t7`, `gateway.t8`, `gateway.t9`, `gateway.t10`, `gateway.t11`, `gateway.t12` |
| Messages | `gateway.m1`, `gateway.m2`, `gateway.m3`, `gateway.m4`, `gateway.m5`, `gateway.m6`, `gateway.m7` |
| Groups | `gateway.g1`, `gateway.g2`, `gateway.g3`, `gateway.g4`, `gateway.g5`, `gateway.g6`, `gateway.g7` |
| Kafka security | `gateway.s1.list`, `gateway.s1.create`, `gateway.s1.delete`, `gateway.s2.list`, `gateway.s2.alter` |
| Additional | `app.access.manage`, `app.audit.view`, `gateway.lock.override` |

`app.access.manage` controls application role/assignment administration and can grant additional access; it does not itself grant Kafka operations. `app.audit.view` controls application audit viewing. `gateway.lock.override` supplements the selected operation permission and requires a request-scoped reason; it is not a standalone Kafka-operation grant or bypass of other safety controls. Credential selection stays server-side; S1/S2 lists still require configured operator-tier Gateway credentials without implying user mutation permission.

### 8.3 Application Endpoint Baseline

All paths below use prefix `/api/v1`. These are UI-backend endpoints, not changes to Gateway. Non-public routes require a valid session; state-changing browser requests require antiforgery protection, including sign-in initiation, emergency login, activity, and logout. OIDC callbacks retain their protocol-specific validation rather than API antiforgery-header requirements. The table selects methods, paths, and the stated fields; it is not yet a complete DTO/OpenAPI schema.

| Method | Path | Approved contract / access |
|---|---|---|
| GET | `/auth/bootstrap` | Public bootstrap: configured provider IDs/display names and antiforgery request token; no credentials or configuration secrets. |
| POST | `/auth/login/{providerId}` | Public authentication entry: begin allowlisted OIDC flow with validated local `returnPath`. |
| POST | `/auth/emergency` | Public authentication entry: `{password}` for the single configured identity; throttle and audit before session issuance. |
| GET | `/session` | Current principal, login/idle/absolute expiry, and application permissions. |
| POST | `/session/activity` | Explicit activity notification; empty body; session and antiforgery required. |
| POST | `/session/logout` | Revoke current session and clear session cookie. |
| GET | `/permissions` | Fixed catalog; requires `app.access.manage`. |
| GET | `/roles` | List roles; requires `app.access.manage`. |
| POST | `/roles` | Create role from `{name, permissionIds}`; requires `app.access.manage`. |
| PUT | `/roles/{id}` | Replace editable role fields; requires `app.access.manage` and `If-Match` revision. |
| GET | `/assignments` | List assignments; requires `app.access.manage`. |
| POST | `/assignments` | Create provider-qualified role assignment; requires `app.access.manage`. |
| PUT | `/assignments/{id}` | Update assignment; requires `app.access.manage` and `If-Match` revision. |
| GET | `/clusters` | Authorized registrations and permitted observations, never registry credentials. |
| GET | `/audit` | Paginated/filterable audit history; requires `app.audit.view`. |
| GET | `/audit/{id}` | Audit event detail; requires `app.audit.view`. |

Register the 46 active Gateway operations as explicit cluster-scoped UI endpoints, never as a catch-all proxy. Their full method/path/DTO/permission/tier/audit mapping remains a separate approval item. Resource identifiers must not grant an arbitrary upstream destination. Callback paths, complete request/response schemas, paging/filter parameters, antiforgery-header naming, and revision header serialization remain to be finalized; no route-table omission authorizes a new capability.

### 8.4 Persistence Field Baseline

Use UUID entity IDs, UTC instants, UUID concurrency revisions, and canonical JSON only for structured snapshots. The following approved field baseline must be refined into provider-specific schemas, not treated as completed migrations. Never persist password material or message bodies in these tables; the emergency password hash remains secret-provisioned under section 7.2.

| Table | Approved fields and selected constraints |
|---|---|
| Sessions | `tokenHash`, `authSource`, `issuer`, `subject`, `claimsJson`, `createdAt`, `lastActivityAt`, `absoluteExpiresAt`, `revokedAt`, `credentialVersion`. |
| Roles | `id`, `name`, `normalizedName`, `revision`; unique normalized name. |
| RolePermissions | `roleId`, `permissionId`; composite primary key and role foreign key. |
| Assignments | `id`, `providerId`, `matchKind`, `claimType`, `matchValue`, `roleId`, `scopeKind`, `scopeId`, `revision`; reject duplicate mappings. |
| LoginThrottle | `accountId`, `sourceAddress`, `windowStartedAt`, `failureCount`, `nextAllowedAt`, `revision`; composite account/address key. |
| AuditEvents | `id`, `attemptId`, `occurredAt`, `correlationId`, principal identity, environment/cluster IDs, operation, sanitized target, phase/outcome, dry-run flag, override reason, error code. |

Final types, lengths, nullability, indexes, normalization/uniqueness rules, foreign-key behavior, session-token hashing details, canonical snapshot representation, and provider mappings remain subject to approval. Audit identity/target concepts in the table are not yet finalized individual column definitions. Preserve section 7.4's durable attempt, local transaction, independent result-write, cancellation, and unmatched-attempt rules throughout schema design.

### 8.5 Session Activity, Cookies, and Error Envelope

- Session cookie name: `__Host-Kafka3O.Session`; Secure, HttpOnly, Path `/`, SameSite=Lax, no Domain. OIDC correlation/nonce cookies use framework-compatible Secure/SameSite=None settings. Continue to keep authentication tokens out of browser storage.
- Explicit authenticated navigation and submitted user actions invoke `POST /api/v1/session/activity`. Passive viewing and background polling never invoke it. Use server time and an atomic monotonic `lastActivityAt` update only while the session remains valid. An activity request cannot revive an expired or revoked session. The 4-hour idle and 8-hour absolute limits remain unchanged.
- Error envelope fields: `{code, message, status, requestId, fieldErrors?, upstreamCode?, outcome}`. Sanitize every returned field. Exact code and outcome enums and field-error element schemas remain to be finalized.

| Condition | Approved HTTP status / semantics |
|---|---|
| Input validation | 400 |
| Expired session | 401; do not mistake Gateway credential failure for user-session expiry. |
| Permission denied | 403 |
| Missing resource | 404 |
| Stale revision | 412 |
| Missing required revision precondition | 428 |
| Throttled | 429 |
| Audit/database unavailable | 503; required pre-execution persistence failure blocks the action. |
| Upstream timeout | 504; mutation `outcome: "unknown"` unless non-execution is established. |

Preserve upstream safety error codes and per-item 207 outcomes. Post-execution audit-result failure must retain the known business result and distinguish audit persistence failure; a generic 503 must not erase a known result, imply rollback, or prompt automatic replay. The concrete response representation for this combined condition remains to be finalized. Never automatically retry ambiguous mutations.

### 8.6 Operational Limits and Maintenance Recovery

| Setting | Approved value / behavior |
|---|---|
| Gateway connection timeout | 5 seconds |
| Ordinary read deadline | 30 seconds |
| Mutation deadline | 60 seconds |
| Throughput sample deadline | Requested sample duration + 10 seconds, maximum 70 seconds |
| Audit write deadline | 5 seconds each; result recording remains independent of request cancellation under section 7.4. |
| Application operation deadline | 85 seconds |
| Ingress deadline | 100 seconds |
| Visible health polling | Every 30 seconds; paused in hidden tabs; does not renew session activity. |
| Message polling | No automatic message polling. |
| Upload limit | 10,000,000 bytes, further constrained by Gateway. |
| Shutdown | Stop admission, drain for 90 seconds, Kubernetes termination grace 110 seconds. Interrupted mutations remain unknown; no automatic replay. |

Keep operation budgets compatible with requested scan/sample durations and the per-operation Gateway bounds. These are approved design values, not benchmarked performance claims. Detailed deadline propagation, admission/readiness sequencing, request-body limits for non-upload endpoints, and configured-bound validation still require concrete contracts.

Database upgrades use an explicit maintenance command while the application is stopped, with a backup first. Back up the database and required Data Protection key material, execute the selected provider's migrations, then validate schema compatibility before startup. Never migrate on normal startup. On migration failure, stay stopped and restore the matching backup rather than automatically down-migrating. Restoration never replays unmatched audit attempts or claims to reverse Kafka writes. Exact command syntax, backup/restore tooling, key/certificate handling, and post-restore session/security reconciliation remain approval items.

### 8.7 Remaining Decisions and Verification Gate

This approval records one contract batch, not the Step 8 audit sign-off required before Step 9.

The following list records the gaps at batch 1. Section 9 supersedes pending decisions only where it explicitly selects their values; section 9.7 is the current remaining-decision list.

- Finalize all 47 cluster endpoint mappings and request/response DTOs; full application endpoint schemas, OIDC callback/antiforgery details, error/outcome enumerations, concurrency header behavior, and audit-failure response representation.
- Finalize provider schemas/constraints/indexes, session hashing/expiry concurrency mechanics, throttle progression/concurrency, retention queries, migration tooling, first-install key provisioning, key/certificate rotation and restore security rules.
- Verify route-specific empty-confirm previews and resolve multi-partition orchestration semantics without Gateway changes or scope reduction. Source inspection alone does not close these gaps.
- Complete deadline propagation and lifecycle details, scan-bound validation, and remaining payload/resource limits. Existing test-tool/deployment selection and all-severity zero-CVE release gates remain mandatory.

This batch changes documentation only. No application scaffold, Gateway modifications, runtime/HTTP tests, migrations, benchmarks, or vulnerability scans were performed. Subsequent changes need approval at the relevant design gate; do not clean pending diff markers before their task actions exist.

## 9. Approved Detailed Contract Batch 2

Approved on 2026-09-25. The user accepted all six proposed refinements below. These decisions refine sections 7 and 8 without modifying Gateway, reducing functional scope, approving the entire visual design, or issuing a Step 8 sign-off. Earlier statements that these particular choices are pending are superseded by this section; unselected details remain open.

### 9.1 Explicit Cluster Route Mapping

Map every active command operation at `/v1/...` to a UI endpoint at `/api/v1/clusters/{clusterId}/...`, preserving its HTTP method and the suffix after `/v1/`. Register the 46 active command operations explicitly, with their individual permission IDs from section 8.2. This rule defines their path mapping, not a runtime catch-all or arbitrary forwarding endpoint.

| Gateway command endpoint | Corresponding UI endpoint |
|---|---|
| GET `/v1/health/live` | GET `/api/v1/clusters/{clusterId}/health/live`, permission `gateway.c3.live` |
| GET `/v1/health/ready` | GET `/api/v1/clusters/{clusterId}/health/ready`, permission `gateway.c3.ready` |
| POST `/v1/replays` | Deferred beyond v1: no UI endpoint is registered; requests receive the ordinary 404 `NOT_FOUND` and dispatch no Gateway call. |

Resolve `clusterId` only against authorized configured registrations; never accept caller-controlled Gateway URLs or credentials. Preserve resource parameter encoding, current authorization, server-selected credential tier, audit, preview, and confirmation rules. Route mirroring does not imply raw DTO passthrough: exact numeric strings, sanitization, and UI response metadata remain UI contracts. Gateway documentation routes are not additional command operations.

Validation must enumerate the pinned Gateway command catalog (41 IDs / 47 operations) and assert 46 distinct active method/path mappings, 40 command IDs, no M8 mapping, no collisions, correct individual permissions, and rejection of unregistered destinations. Complete per-operation DTO/tier/audit bindings and target-deployment verification remain required; these examples are not a claim that endpoints exist in code.

### 9.2 Business Result and Audit Recording Failure

When execution has a known business result but subsequent audit-result recording fails, preserve that result and return separate `auditStatus: "recording_failed"` metadata plus the correlation ID. The UI shows a persistent audit warning alongside the actual result. Do not relabel known success as operation failure, imply rollback, or automatically retry the operation. Preserve known partial/item outcomes as well; do not replace a 207 result with a generic failure.

Failure to persist required pre-execution audit data still blocks execution under sections 7.4 and 8.5. If the business outcome itself is unknown, audit metadata must not convert it to success. Crash-recovered unmatched attempts remain unresolved and are never replayed automatically. Detailed metadata placement, complete status enumeration, and download/non-JSON response handling remain to be specified; this decision selects semantics and the failure field/value, not a complete new response envelope.

Validation must inject result-write failure after a known successful or partially successful mutation, verify preserved result/correlation and the persistent warning, and assert exactly one business execution. Separate attempt-write failure tests require zero executions.

### 9.3 Session Identifier and Antiforgery Handling

- Generate session identifiers from 32 cryptographically random bytes. Store only their SHA-256 hashes in the session database, never the raw bearer identifiers. Retain the protected cookie settings and database-backed validation rules in sections 7.1 and 8.5. This hashing choice applies to high-entropy session identifiers, not human passwords; emergency passwords retain the approved Identity password hasher.
- Use ASP.NET Core antiforgery with request header `X-CSRF-TOKEN`. Keep the request token in browser memory, not local/session storage or other persistent client storage. Refresh antiforgery state after login and logout so it is bound to the current authentication context. OIDC callbacks continue to use their distinct state/nonce/correlation validation.
- Check expiry and revocation before any activity update; expired sessions cannot be renewed. Explicit activity remains governed by section 8.5, including its monotonic server-time update and exclusion of automatic polling.
- Validate random identifier generation/hash lookup without raw identifiers in database or diagnostics, missing/invalid antiforgery headers, authentication transitions, and expiry racing with activity. Cookie/token serialization, hash storage format, and the precise database concurrency mechanism remain to be finalized.

### 9.4 Emergency Login Throttle Schedule

Retain persisted failed-verification state per emergency-account/source-address pair and the five-failure threshold within 15 minutes. Following the fifth failed verification, set the first delay before another verification is allowed; each subsequent failed verification advances the capped schedule below.

| Failed verification count in the active sequence | Delay before another verification |
|---|---|
| 5 | 1 second |
| 6 | 2 seconds |
| 7 | 4 seconds |
| 8 | 8 seconds |
| 9 | 16 seconds |
| 10 | 32 seconds |
| 11 and later | 60 seconds |

Reject requests arriving before the next allowed time with HTTP 429 and `Retry-After`, without running another password verification. An early rejected request is not a failed password verification. Reset the pair's sequence after successful login or 15 minutes without a failed verification. Never permanently lock the emergency account; retain trusted-proxy-only handling of forwarded source addresses.

Permit at most two concurrent password verifications application-wide, with no waiting queue. This limits expensive hashing work; it is not proof of protection from distributed guessing. Atomic counter/admission mechanics, exact rolling-window representation, reset boundary behavior, and the global-cap overload response contract remain to be finalized rather than inferred from the delay table.

Controlled-clock tests must cover the fifth-failure boundary, each delay, the 60-second cap, early rejection without hashing, reset after success/inactivity, restart persistence, and no more than two concurrent verifications with no queue. Run persistence-related cases against both approved database providers.

### 9.5 Controlled Key Initialization and Rotation

Initialize the protected Data Protection key store through an explicit first-install maintenance command. Normal application startup fails if required keys are missing or unreadable; it must not silently recreate lost material. Keep the durable protected storage and secret-provisioned certificate requirements from section 7.3.

During certificate rotation, encrypt new keys with the new certificate. Retain old decryption certificates until no retained live or backup key material requires them. Removing a certificate merely because it is no longer used to encrypt new keys is not a valid retirement rule. Exact command syntax, first-install detection, permissions, backup inventories, and retirement verification procedures remain to be finalized.

Verification must distinguish deliberate first installation from a lost key store, reject normal startup with missing/unreadable keys, and exercise decryption of retained keys across rotation and restoration. No key-provisioning or rotation command has been implemented or executed for this documentation update.

### 9.6 Post-Restore Access Reconciliation

Keep the application stopped during restoration. Restore matching database and key material, invalidate all restored sessions, and reconcile roles, assignments, and emergency credential versions before reopening access. This prevents restored session records from automatically granting access after recovery; it does not imply that restoring stale roles is safe without review.

Preserve unmatched audit attempts as unresolved. Never automatically replay them or claim that restoring the UI database rolls back Kafka changes. Retain section 8.6's backup-first maintenance process and stay-stopped behavior on migration/recovery failure. Exact recovery commands, the authoritative source/checklist for access reconciliation, and validation of completion remain design items.

Recovery tests must prove pre-restore cookies cannot authenticate after session invalidation, reopening is gated on the reconciliation procedure, and unmatched attempts remain visible without business re-execution. No production backup or restore is authorized by this specification edit.

### 9.7 Remaining Decisions and Verification Gate

Acceptance of these six decisions is not the Step 8 readiness sign-off required for Step 9 task creation.

This list records the remaining decisions at batch 2. Section 10 resolves the explicitly selected contracts below; section 10.7 is the current remaining-decision list.

- Complete the 47-operation request/response DTO, permission/tier/audit binding table under the approved route-mapping rule; application endpoint schemas, OIDC callback paths, revision headers, exact error/outcome codes, and audit metadata placement for JSON and non-JSON results.
- Finalize provider schemas, lengths/nullability/indexes/constraints, session representation and expiry concurrency, throttle window/admission/reset mechanics and overload responses, and retention queries.
- Finalize maintenance command syntax/tooling, key initialization/rotation/retirement procedures, and restore/access-reconciliation enforcement. The approved session invalidation and certificate-retention rules are mandatory, not pending choices.
- Verify route-specific empty-confirm previews and resolve multi-partition continuation/aggregation semantics without Gateway changes or feature reduction. Investigation approval is not compatibility evidence.
- Complete deadline propagation, lifecycle sequencing, scan-bound validation, and remaining request/resource limits. Existing package/deployment selections, executable tests, compatibility evidence, and all-severity zero-CVE release gates remain required.

This batch updates specifications only; no application code, Gateway files, tests, credentials, key stores, or deployed resources are changed. Runtime tests and security evidence remain pending. Keep diff history until corresponding task actions are created under the pipeline rules.

## 10. Approved Detailed Contract Batch 3

Approved on 2026-09-25: all six proposed decisions were accepted. This section supersedes earlier pending-choice statements only for the contracts it explicitly defines. It does not change Gateway or authorize application implementation, scope reduction, or a Step 8 readiness sign-off.

### 10.1 Response and Audit Metadata

JSON operation-result responses use `{data, meta: {requestId, auditStatus}}`. Preserve the business result in `data`, including per-item outcomes and HTTP 207 for partial results. `requestId` is the correlation identifier. The fixed audit-status values are:

| Value | Meaning |
|---|---|
| `recorded` | Required audit recording for the returned result completed. |
| `recording_failed` | Post-execution result recording failed; preserve the known business outcome and show a persistent warning. |
| `not_required` | The applicable audit policy requires no recording for this operation. Never use this to bypass emergency-action or other mandatory auditing. |

File downloads retain their original contents and expose equivalent correlation/audit metadata through response headers. The frontend checks metadata before presenting success, including download success. This does not authorize a payload wrapper inside an exported definitions file. Exact download metadata header names and response-finalization behavior remain to be specified.

Pre-execution audit failure still blocks execution; unknown business outcomes remain unknown. The existing classified error envelope in section 8.5 is not replaced by a successful-result wrapper. Application-list `{items, page}` results occupy `data` when returned through the JSON result envelope. Redirects, OIDC callbacks, and responses without a body do not acquire an invented JSON body through this rule.

Verification must distinguish known success with failed audit recording, partial 207 results, and genuinely failed/unknown operations; assert preserved payloads, metadata inspection, persistent warnings, and no automatic business retry. Download checks must verify byte-preserved file content and equivalent metadata handling.

### 10.2 Role and Assignment Revision Preconditions

Return a strong `ETag` containing the quoted revision UUID for a role or assignment representation. An update requires that exact value in `If-Match`. Missing preconditions return 428; an outdated revision returns 412. Reject wildcard updates and never silently overwrite another administrator's changes. A weak validator does not satisfy the exact strong-revision requirement.

Revision comparison and the write must be atomic; a preliminary client or server read is insufficient to prevent a concurrent overwrite. Preserve the existing durable audit attempt and atomic local change/successful-result transaction. Verification must include two updates using the same revision, with only one committed change, and missing/stale/wildcard precondition cases. Detailed malformed-header errors and representation schemas remain part of the endpoint contract work.

### 10.3 Application-Owned List Pagination

Roles, assignments, and audit history accept `pageNumber` starting at 1 and `pageSize` defaulting to 50 with a maximum of 500. Their list result is `{items, page: {number, size, total}}`, carried as `data` under section 10.1. `total` is the total matching item count, not merely the count returned on the current page. Retain all applicable authorization and approved audit filters.

| List | Stable ordering |
|---|---|
| Roles | Normalized name ascending, then ID ascending. |
| Assignments | ID ascending. |
| Audit events | UTC timestamp descending, then ID descending. |

Gateway-backed lists retain their existing pagination contracts; this decision does not rename Gateway parameters or change upstream ordering. Test default/maximum sizes, invalid bounds, empty results, filtering, and tied primary sort values. Stable ordering does not imply snapshot isolation across multiple requests while data changes.

### 10.4 Throttle Window and Admission

Count failed emergency password verifications in a rolling 15-minute window until the fifth failure activates the delay sequence in section 9.4. Once triggered, retain escalation until a successful verification or 15 minutes without a failed verification. An early rejected request does not run password hashing or increment failures, and is not a failed verification that extends the inactivity reset.

Serialize verification admission for the same account/source-address pair so concurrent requests cannot bypass its threshold or delay. Enforce the previously approved application-wide maximum of two simultaneous password verifications. When both slots are occupied, return 429 with `Retry-After: 1`, without queuing, hashing, or incrementing failures. Preserve the no-waiting-queue rule; serialization must not introduce an unbounded request queue.

A rolling window requires enough persisted history to distinguish failures inside and outside that window; the section 8.4 counter/window field sketch is not, by itself, a complete rolling-window storage design. Final storage and atomic admission mechanisms remain part of the provider-schema work. Test burst concurrency, rolling-window boundaries, escalation persistence, reset behavior, overload response, and zero hash invocations for rejected admission.

### 10.5 Atomic Activity and Expiry Boundary

A session is expired when `now >= expiry`, for either idle or absolute expiry. Atomically update activity only if the stored session is unrevoked and both deadlines remain valid. Compare against the existing idle deadline before renewing it, using server time; set the activity timestamp to the later of its existing value and server time. Concurrent requests must not move activity backward.

Logout or revocation must never be undone by a competing activity update. The operation must preserve revocation state and cannot recreate or reactivate an invalidated session. Absolute expiry never moves. The explicit-user-activity classification and 4-hour idle / 8-hour absolute limits remain unchanged.

Controlled-clock and real-provider concurrency tests must cover one instant before expiry, exact equality, after expiry, out-of-order activity writes, and logout/revocation racing with activity. Validate equivalent behavior on SQLite and PostgreSQL; no such tests have run for this specification update.

### 10.6 Provider-Specific OIDC Callbacks

| Provider | Fixed callback path |
|---|---|
| Entra ID | `/signin-oidc/entra` |
| Cognito | `/signin-oidc/cognito` |

Register each path as an exact HTTPS redirect URI under the application's configured public origin at its provider. These callback paths are outside the `/api/v1` application-endpoint prefix. Bind each callback to its configured authentication scheme and retain issuer/audience, state, nonce, correlation, and PKCE validation. They do not use the browser API antiforgery-header requirement.

Permit only validated same-origin relative return paths; reject external and protocol-relative destinations. Never automatically resume a mutation after authentication. Verification must cover both providers in one deployment, callback/scheme mismatch, invalid protocol binding, and external/protocol-relative return-path rejection.

### 10.7 Remaining Decisions and Verification Gate

Approval of these contracts is not approval to start Step 9 or to waive the release gates.

This list records the gaps at batch 3. Section 11 supersedes the explicitly resolved choices; section 11.7 is the current remaining-decision list.

- Complete per-operation request/response DTOs and permission/tier/audit bindings, application endpoint field schemas, error/outcome enumerations, malformed-precondition behavior, and download metadata header names/finalization. The approved result wrapper, ETag rule, pagination, and callback paths are no longer pending choices.
- Finalize provider types/lengths/nullability/indexes/constraints, session/token representation and atomic database operations, persisted rolling-window throttle storage/admission mechanics, and retention queries. Preserve the approved expiry boundaries, throttle escalation/reset, and overload responses.
- Finalize maintenance and key-management commands/procedures and enforceable restore/access reconciliation, using the approved session invalidation and certificate-retention rules.
- Resolve empty-confirm HTTP preview compatibility and multi-partition continuation/aggregation semantics without Gateway changes or feature reduction. No source inspection or design approval substitutes for the required compatibility checks.
- Complete deadline propagation, lifecycle sequencing, scan-bound validation, and remaining resource limits. Package/deployment selections, executable tests, compatibility evidence, and zero-CVE release gates remain required.

This is a documentation-only approval record. No application or Gateway code, deployed resources, credentials, or key material changed; no runtime tests or security scans were performed. Preserve earlier history and pending diff markers until task actions exist.

## 11. Approved Detailed Contract Batch 4

Approved on 2026-09-25: all six proposed decisions were accepted. These choices refine earlier sections without changing Gateway. They do not approve a complete continuation algorithm, the entire visual-design draft, or Step 8 readiness. Superseded pending-choice statements are historical; only the explicit decisions below are resolved.

### 11.1 Conditional Topic-Details Permission

V1 note: M1/M3/M4 always take explicit single-partition offset inputs and M8 is deferred, so no backend partition-bound discovery occurs in v1. The rules below remain for the deferred snapshot workflows; T2 stays a separately authorized read.

Snapshot-based browsing, searching, and replay require `gateway.t2` alongside the selected operation permission when the UI backend must discover partition bounds through T2. Never grant T2 implicitly or perform a T2 call solely because the principal has M1, M3, M4, or M8. Authorize T2 for the same configured cluster before the metadata call; apply the existing per-request audit and session rules.

Operations with sufficient explicit inputs retain their existing permission requirements; this is not a blanket T2 prerequisite for every message request. A user may open an otherwise permitted operation form, but discovery-dependent execution must stop with an actionable permission explanation when T2 is absent. Reused bounds, continuation state, and changed inputs must obey the eventual validated continuation contract; permission approval alone does not prove those inputs sufficient.

Test operation-only access with sufficient inputs, rejection of discovery without T2 with zero unauthorized metadata calls, permitted discovery with both permissions, cross-cluster denial, and permission revocation before a subsequent metadata request. Gateway remains unchanged, and stable bounds/ordering/aggregation still require compatibility investigation.

### 11.2 Download Metadata and Export Limit

File downloads expose `X-Request-Id` and `X-Kafka3O-Audit-Status`. Use the same correlation identifier and `recorded`, `recording_failed`, or `not_required` semantics as JSON metadata in section 10.1. The frontend checks these headers before displaying success and retains a persistent warning for failed result recording.

Finish fetching the export and attempting required audit-result recording before sending response headers. Required pre-execution audit failure still prevents the upstream action. Preserve the export file contents: do not inject metadata or the UI JSON response wrapper into them.

Apply a UI export limit of 10,000,000 bytes. Exports exceeding it fail explicitly; never silently truncate or return a partial file as successful. This is a newly approved UI limit, not a claim about Gateway's configured restriction. Buffering/storage mechanics must remain bounded and within the operation deadlines; their concrete implementation remains to be specified.

Verify byte-preserved exports, headers consistent with actual audit recording, no early header commit, exact-limit acceptance, over-limit failure, and no successful partial file after upstream failure. Never replay a business operation to repair result-audit failure.

### 11.3 Error Outcome Enumeration

| Error envelope `outcome` | Required semantics |
|---|---|
| `not_started` | The business operation did not start. Use for validation, permission denial, and failed required pre-execution audit. |
| `failed` | Failure is established; this does not imply rollback or prove that no effects occurred. Preserve reported progress/details. |
| `unknown` | The business outcome is not established, including ambiguous mutations after transport failure. Never automatically retry. |

These are error-envelope outcomes, separate from audit status. A known successful operation with `auditStatus: "recording_failed"` remains a known business success. Partial results retain HTTP 207 and per-item outcomes instead of becoming generic errors. Verify these distinctions through pre-execution, established-failure, partial-result, and ambiguous-transport scenarios.

### 11.4 Exact Revision-Header Validation

Accept exactly one strong, quoted UUID revision in `If-Match` for role/assignment updates. Missing `If-Match` returns 428. Malformed, weak, wildcard, or multiple values return 400. A valid but stale revision returns 412. No business write occurs on any rejection; required rejection auditing is not an authorization-data write.

Successful updates return the new revision through the strong ETag contract. Preserve section 10.2's atomic compare-and-write and local change/result audit transaction. Verify every rejection category and that two updates with the same initial revision cannot both commit.

### 11.5 Cross-Provider Persistence Conventions

| Concern | Approved convention |
|---|---|
| UUID values | Native UUIDs in PostgreSQL; canonical UUID text in SQLite. |
| Stored timestamps | UTC epoch-millisecond integers in both providers. This storage choice does not relax browser-boundary numeric-precision rules. |
| Session hashes | 32-byte binary SHA-256 session hashes; never raw session bearer identifiers. |
| Equivalent behavior | Explicit provider constraints and tests enforce equivalent semantics rather than relying on differing implicit database behavior. |
| Role names | Provider-independent normalization for role-name uniqueness. |
| Identity/claim matching | Preserve case-sensitive identity and claim matching; role-name normalization must not merge principals or alter claim matching. |

Final table definitions must enumerate lengths, nullability, indexes, relationships, and constraints. Exact canonical UUID formatting and role-name normalization algorithms still require definition; these conventions do not claim complete schemas. Persistence tests must cover both real providers, including duplicate normalized names, case-distinct identity/claim values, timestamp boundaries, and fixed hash length.

### 11.6 Scheduled Audit Retention

Run audit-retention cleanup hourly in batches of at most 1,000 events, using the deployment-configured retention period, default 90 days. Delete only events strictly older than the cutoff; an event exactly at the cutoff remains. Expired unresolved attempts are eligible without changing their classification to success or failure. No interactive audit-deletion capability is introduced.

Cleanup failure produces an operational alert and retries at the next scheduled run. It never disables required audit recording or enables an audit bypass. Preserve in-window records even when their related attempt/result record is expired; final relationship/deletion rules must support the retention invariant without unintended cascading deletion.

Tests must cover the exact cutoff, configurable retention, expired unresolved attempts, bounded batches, preservation of in-window records, and failed-cleanup alert/next-run behavior on both providers. The cleanup alert mechanism and concrete scheduling/query implementation remain to be specified.

### 11.7 Remaining Decisions and Verification Gate

This approval does not authorize Step 9 or waive any release gate.

- All four items are resolved: the first three by section 12.1 (P1-P5) and section 14; empty-confirm previews by P6; multi-partition continuation is deferred by section 13.2.

Evidence boundary: the preceding investigation ran existing focused Go tests in `internal/api`, `internal/service/message`, `internal/service/core`, and `internal/scan` successfully for replay, single-partition cursor resume, dry-run sequencing, and scan continuation/latest behavior. This is limited fake-backed/source-level evidence, not an executed UI adapter, a test of every empty-confirm HTTP route, multi-partition orchestration proof, or a deployed-Gateway integration result. This approval update itself runs documentation checks only; application tests, artifact compatibility, and all-severity zero-CVE release verification remain pending.

## 12. Approved Consolidated Contracts

Approved on 2026-09-25 by the user's "approve" response to the consolidated decision package. [CONSOLIDATED-PROPOSAL.md](CONSOLIDATED-PROPOSAL.md), revision 0.2, is incorporated by reference as a normative contract addendum. Its sections 2-6 implement approved decisions P1-P6; section 7 is historical compatibility evidence, section 8 preserves unresolved design blockers, and section 9 defines mandatory acceptance and handoff criteria. Its original proposal labels are retained history, not pending approval of P1-P6. This approval does not approve the entire visual-design draft.

### 12.1 Adopted Contracts and Precedence

| Decision | Normative addendum section | Approved selection |
|---|---|---|
| P1 | 2 | The 46 active explicit operation/DTO/permission/tier/audit bindings (M8 row retained as deferred history), pinned Gateway schema reference, numeric transformations, message/upload exceptions, and safe status preservation. |
| P2 | 3 | Application DTOs, 16 method/path contracts, exact validation and error catalog; Assignment.enabled supports individual mapping revocation. Typed replay-error progress is deferred with M8 (section 14.5). |
| P3 | 4 | Provider types/limits/constraints/indexes, role normalization, duplicate assignment detection, atomic session/access/throttle operations, retention scheduling and alerts. |
| P4 | 5 | Bounded upload/export/response handling, admission, deadline propagation, probes, startup and shutdown. Required functionality must fit approved limits; failures do not authorize silent scope reduction. |
| P5 | 6 | Explicit key initialization/verification, stopped-app migrations, backup/restore, recovery marker and access reconciliation, certificate rotation, and failure/exit semantics. |
| P6 | 2.3 and 7 | Explicit empty confirmation on initial dry-run requests for the 17 active confirmation-bearing operations (the 18th tested route is deferred M8); execution still requires the exact target or plan token. |

These selections supersede earlier pending-choice statements only for their explicit subjects, including the corresponding items in section 11.7. Preserve all other approved constraints: conditional T2 discovery permission, current per-call authorization, no inherited override, audit gates, no automatic ambiguous mutation retry, one non-overlapping replica, and all-severity zero-CVE release policy. The addendum's new fields and limits are expressly approved; no other behavior is introduced by implication. Gateway remains unchanged.

### 12.2 Remaining Design Blockers

P7 is approved as retention of these blockers and authorization for further isolated adapter investigation, not approval of an algorithm or extra continuation DTO:

- **B1:** Native latest-mode preceding-window continuation and completion reporting cannot yet satisfy the retained UI contract. The probes reproduced an empty preceding window and a byte-bound scan reporting completion without a stop reason.
- **B2:** Per-partition explicit-window primitives do not prove aggregate multi-partition ordering, global bounds, buffered-record handling, sparse/compacted offset behavior, or ambiguous replay outcomes. The bounded continuation-state ownership, shape, expiry, tamper protection, and concurrency contract remains unresolved.

B1/B2 are deferred-feature blockers under section 13.2, not v1 requirements; resolving them is required only before the deferred features are reintroduced. Section 12 is an approval record, not a complete Step 8 audit or a claim that no further audit findings are possible.

### 12.3 Evidence and Handoff Gate

Historical evidence in the addendum records six top-level tests and 20 subtests against actual HTTP handlers with fake Kafka, including the 18 initial-preview routes. Two tests deliberately reproduce limitations, not passing product criteria. That evidence does not establish real Kafka, full adapter correctness, large-offset precision, browser/application behavior, or release security.

Recording this approval runs documentation consistency checks only; the external harness was not edited or rerun. Test/deployment pins and mandatory implementation/integration/security evidence remain pending. Once the compatibility design is resolved, perform the full Step 8 review and obtain separate user sign-off. Only an approved `STATUS: READY` permits Step 9. No task plan, application code, commit, or release authorization is created by this approval.

### 12.4 Approved B1/B2 Recommendations

Sections 12.4-12.6 are deferred with M8 and resumable message workflows under section 13.2. They are recorded design history for reintroduction, not v1 requirements; do not build their routes, tokens, state, or memory manager in v1.

On 2026-09-25 the user approved the recommended B1/B2 approach and starting limits. Incorporate [CONSOLIDATED-PROPOSAL.md](CONSOLIDATED-PROPOSAL.md), revision 0.3, section 8.1 as normative selections: explicit fixed per-partition offset windows, truthful incomplete results, and server-memory continuation state with session/cluster-bound 32-random-byte tokens; 10-minute idle and 30-minute absolute lifetime bounded by session expiry; at most 2 workflows per session and 20 overall; buffered-data limits of 20,000,000 bytes per workflow and 100,000,000 overall. Serialize continuation, reject competing requests and capacity overload explicitly, never silently evict active workflows, and require explicit restart on expiry/state loss with replay duplicate-risk warning. Recheck permissions on every continuation and never automatically retry uncertain writes. No message-payload persistence or Gateway modification is approved.

These selections supersede section 12.2's unresolved ownership/expiry/limit direction only to the stated extent. They do not select an exact workflow API, full state machine, token transport, byte-accounting/admission algorithm, idle-refresh semantics, ordering tie rule, or lost-response protocol. The addendum's section 8.2 identifies remaining contract work. Buffered-data caps are not a measurement of total process memory; implementation must account for overhead without silently relaxing the selected limits.

B1/B2 remain unresolved pending complete contract decisions and executable compatibility proof. This approval update performs documentation checks only; historical compatibility results are not new evidence. It does not approve the whole visual-design draft or authorize Step 9.

### 12.5 Approved Workflow Recommendations

On 2026-09-25 the user approved all six further workflow recommendations. Incorporate [CONSOLIDATED-PROPOSAL.md](CONSOLIDATED-PROPOSAL.md), revision 0.4, section 8.3 as normative W1-W6: separate create/advance/inspect/stop operations with tokens in a dedicated header, never URLs/logs; immutable operation/cluster/topics/partitions/filters/bounds; expected-revision advancement with rejection of stale/competing requests and no duplicate replay dispatch; states `ready`, `running`, `paused`, `completed`, `stopped`, `unknown`; idle refresh only for accepted user-directed advancement, with expiry stopping new calls while bounded result auditing finishes; reserve capacity before fetching and account for retained copies/in-flight buffers without silently dropping unreturned records.

These choices supersede earlier pending statements only for the stated principles. Existing workflow limits, per-call authorization/auditing, request-scoped overrides, and no automatic uncertain-write retry remain mandatory. Returning an already-retained result is not repeating the Kafka mutation and cannot bypass current authorization. This does not claim exactly-once delivery or authorize an unbounded result cache.

The addendum's section 8.4 now lists remaining exact API/DTO/header, revision/request identity, state-transition/error, expiry/cleanup, memory-accounting, and ordering/algorithm decisions and proof requirements. No new workflow route has been selected by implication. Only documentation checks are performed for this approval; Gateway and external compatibility harness are unchanged.

### 12.6 Approved Item-1 Contract Package

On 2026-09-25 the user approved the six concrete recommendations for item 1. Incorporate [CONSOLIDATED-PROPOSAL.md](CONSOLIDATED-PROPOSAL.md), revision 0.5, section 8.5 as normative I1-I6: four UI-backend routes at `/api/v1/clusters/{clusterId}/message-workflows` (POST/GET base, POST `/advance`, POST `/stop`); `X-Kafka3O-Workflow-Token` using unpadded base64url for 32 random bytes, browser-memory-only retention, telemetry redaction and no-store; typed create/advance selections and metadata-only inspection; strong UUID revision plus client UUID `advanceId`, current authorization before duplicate lookup, duplicate lookup before stale-revision rejection, no repeated dispatch, latest-result retention until acknowledged by the next accepted advancement or expiry; selected six-state transitions with `stopRequested` and uncertainty precedence; selected 428/412/409/429/413/404 error uses and expiry cleanup; actual allocated-buffer accounting, atomic reservation and separate metadata caps of 1,000,000 bytes per workflow and 20,000,000 overall.

Preserve approved buffered-data caps of 20,000,000 bytes per workflow and 100,000,000 overall, 2 workflows per session and 20 overall, 10-minute idle/30-minute absolute lifetime bounded by session expiry, all per-call authorization/audit gates, request-scoped confirmation/overrides, and no automatic uncertain-write retry. Creation does not perform replay writes. Inspection and duplicate-result retrieval do not renew idle. No silent partition omission or record loss is authorized. These four workflow routes supplement, rather than replace, the 16 existing application routes and 47 Gateway-operation bindings. Gateway remains unchanged.

This supersedes earlier pending statements only for the explicit I1-I6 selections. Addendum section 8.6 tracks complete field-level schemas, remaining state/error/stop semantics, bounded request-identity history, cleanup/accounting mechanics, and latest/multi-partition algorithm and proof still required. Only documentation consistency checks are performed for this approval; no harness rerun, application test, benchmark, or security clearance is claimed. Full Step 8 review and separate approved READY sign-off still precede Step 9; no task plan or implementation is authorized here.

## 13. Approved Reduced-V1 Scope and Contracts

Approved on 2026-09-26. Adopt FUNC-SPEC 0.6 section 1.5 and [CONSOLIDATED-PROPOSAL.md](CONSOLIDATED-PROPOSAL.md) revision 0.6 section 11 as the controlling first-release profile. This explicitly approved reduction supersedes earlier requirements to deliver every Gateway capability in v1, while preserving those requirements as deferred history. No Gateway modification or additional unapproved feature reduction is authorized.

### 13.1 Active V1 Surface

Keep all cluster, topic, consumer-group, SCRAM and quota operations, plus M2 and M5-M7. M1/M3/M4 are one-shot bounded scans with exactly one explicit partition and explicit start/end offset selections; retain all applicable regex/JSONPath fields/operators and data semantics. Enforce restrictions in the backend with existing validation errors and zero scan dispatch on invalid/unsupported selection. Preserve Gateway record order and scan information; no automatic continuation or cross-request snapshot/exhaustive-search promise.

Active totals are 40 command IDs / 46 Gateway-operation bindings / 49 permission literals, plus the existing 16 application routes. Exclude `gateway.m8` from active permission input/output/storage catalogs and do not register replay or message-workflow routes. The source Gateway schema still enumerates 41 command IDs / 47 operations; compare the v1 projection to that unchanged fixture rather than changing Gateway or its schema. The active destructive-preview set has 17 operations; historical 18-route evidence includes M8.

Preserve dual SSO, emergency access, application roles/assignments, session expiry/revocation, audit durability, SQLite/PostgreSQL, maintenance/recovery, single-replica deployment, and every safety/release gate for retained operations. Emergency access cannot enable an excluded feature. Conditional T2 permission remains required only for actual optional metadata discovery, not sufficient explicit scan inputs.

### 13.2 Deferred Features and Removed V1 Complexity

Defer M8 in full, including preview, replay and re-drive; latest-N and preceding-window message browsing; multi-partition M1/M3/M4; beginning/timestamp selectors for those three operations; resumable message browsing/search; and cross-request snapshot guarantees. Timestamp/multi-partition inputs on other retained operations are unchanged.

Sections 12.4-12.6 and addendum section 8's workflow API/token/revision/identity-ledger/retained-result/expiry/stop/memory-manager contracts are deferred with their feature. Do not scaffold a v1 ReplayService or workflow subsystem merely because the earlier topology/examples named one. Keep ordinary feature services and request-local bounded response handling. Role/assignment revisions, session state, audit history, and operational recovery are not deferred.

B1/B2 remain unresolved for deferred features; they are not v1 adapter dependencies or passing compatibility results. New scope approval, completed contracts and appropriate proof are required before reintroduction. No exactly-once or replay-recovery capability is introduced.

### 13.3 V1 Completion, Resources and Verification

Scans preserve Gateway `reachedEnd`, `stoppedBy`, counts and cursor information, but item count, empty output or timeout alone never establish completion. Sparse/compacted logs can yield incomplete results; requested bounds are not evidence of immutable content or complete coverage. A separate user submission is an independent query. Use ordinary loading/result/error states; cancellation never claims rollback or non-execution.

Keep addendum section 5's request-local limits, deadlines and concurrency, including the 20,000,000-byte other-Gateway-response cap. Bound allocations and release request buffers on all exits; no server-side retained message-result cache. Existing browser transient-state and no-store rules apply. Partial/unknown outcomes and no automatic ambiguous retry remain mandatory for all retained mutations.

Addendum section 11.4 and FUNC-SPEC's revised V1/V12/V15 govern active acceptance. Test exactly 46 route bindings and 49 permissions, replay/workflow absence, unsupported scan rejection, one-partition explicit-offset scans, sparse/bounded/empty behavior, precision/data integrity, authorization/audit/override gates, buffer cleanup and cancellation. Preserve all retained V1-V20 obligations and normal database/browser/integration/deployment/security gates. Deferred-feature checks are explicitly deferred, never reported as passes or substituted for tests of retained behavior.

### 13.4 Approval and Handoff Status

B1/B2 are now deferred-feature blockers rather than retained-v1 requirements. Release verification remains `PENDING`; scope approval is neither compatibility proof nor security clearance. No task creation or implementation is authorized by this approval record.

This update runs documentation consistency checks only. Gateway and the external compatibility harness remain unchanged; no new runtime, browser, real Kafka, memory benchmark, or vulnerability evidence is claimed. The design document's scope/navigation is aligned, but its visual/UX draft is not approved by this decision.
## 14. Approved Step 8 Remediation Contracts

Approved on 2026-09-26 by the user's acceptance of the Step 8 audit recommendations F1-F8. F9 (browser routes), F10 (metrics exposure), and F11 (maintenance manifest schemas) were found while applying that approval and were confirmed by the user with the Step 8 sign-off on 2026-09-26. This section adds no Gateway change and no feature beyond the reduced-v1 scope in section 13.

### 14.1 Consistency Reconciliation (F1)

Superseded replay, continuation, 47-operation, 18-preview, and B1/B2-as-v1-blocker passages in FUNC-SPEC, this specification, CONSOLIDATED-PROPOSAL, and DESIGN-SPEC were replaced with v1 text; the Step 9 cleanup removed the superseded wording from FUNC-SPEC and this specification (history remains in version control). Deferred-feature history (sections 12.4-12.6, addendum section 8) stays readable and is labelled deferred.

### 14.2 Operation Availability Without Runtime Discovery (F2)

- The backend does not fetch Gateway OpenAPI at runtime, and `ClusterView` carries no operation-availability field. Release verification compares each targeted Gateway's served `/openapi.json` with the pinned fixture (addendum section 2.1).
- A Gateway error envelope is a JSON object with an `error` object containing a string `code`. For any Gateway call, an upstream 404 or 405 whose body is not such an envelope maps to `UPSTREAM_OPERATION_UNAVAILABLE`, HTTP 502, outcome `not_started`, because the Gateway router rejected the route before any handler ran. A 404 with an envelope maps to `UPSTREAM_REJECTED` with `upstreamCode` from the envelope (for example `NOT_FOUND`: resource missing). Other statuses keep the addendum section 3.4 mapping.
- Scan and throughput bounds come from the per-cluster configuration in section 14.3. The effective maximum is the configured `Max`; an omitted request bound uses the configured `Default`. Values outside `[1, Max]` return 400 `VALIDATION_FAILED` before dispatch. A Gateway `BOUND_EXCEEDED` response is still shown as a correctable validation error. No version-mismatch detection exists in v1.

### 14.3 Deployment Configuration Schema (F3)

Configuration binds from the `Kafka3O` section of ASP.NET Core configuration (`appsettings.json`, then environment variables using `__` separators). Startup validates every rule below, rejects unknown keys under `Kafka3O`, and fails before readiness on any violation, logging the key name but never a value. Secret values are never configuration values: each `*File` key names a mounted file whose UTF-8 content (one trailing newline trimmed) is the secret. `config/` and the Helm chart provide sanitized examples of exactly these keys. Ports are fixed: application HTTP 8080, metrics 9090 (section 14.8); TLS terminates at the ingress.

| Key | Type and constraint | Required / default |
|---|---|---|
| `PublicOrigin` | Absolute `https` origin (scheme, host, optional port); no path, query, or fragment. Used for OIDC redirect URIs. | Required |
| `Database:Provider` | `Sqlite` or `PostgreSql` | Required |
| `Database:ConnectionStringFile` | Path to the connection-string secret file | Required |
| `DataProtection:KeyRingPath` | Absolute directory on the protected durable key volume | Required |
| `DataProtection:Certificates` | Non-empty array of `{CertificateFile, PrivateKeyFile}` PEM paths. The first entry encrypts new keys; all entries may decrypt (section 9.5). | Required |
| `Operations:StatePath` | Absolute directory on the durable operations volume, outside the backup/restore set. Holds `instance.lock` and the recovery marker. | Required |
| `Emergency:AccountId` | Configuration ID (`[A-Za-z0-9][A-Za-z0-9._-]{0,63}`); also the emergency session and audit `subject` | Default `emergency` |
| `Emergency:DisplayName` | 1-100 Unicode scalars, no control characters | Default `Emergency access` |
| `Emergency:PasswordHashFile` | File containing an ASP.NET Core Identity V3 PBKDF2-HMAC-SHA512 hash; startup rejects fewer than 210,000 iterations | Required |
| `Emergency:CredentialVersion` | 1-128 bytes of printable ASCII; changing it revokes emergency sessions | Required |
| `Oidc:Entra`, `Oidc:Cognito` | Optional sections. A present section enables that provider with fixed provider ID `entra` or `cognito` and its fixed callback path (section 10.6). | Optional; emergency access is always available |
| `Oidc:*:DisplayName` | 1-100 Unicode scalars | Required in a present section |
| `Oidc:*:Issuer` | Exact `https` issuer; also the OIDC authority. Tokens must carry exactly this `iss`. | Required in a present section |
| `Oidc:*:ClientId` | Non-empty string | Required in a present section |
| `Oidc:*:ClientSecretFile` | Path to the client secret file; omitted for public clients (PKCE is always used) | Optional |
| `Oidc:*:Scopes` | Non-empty array; must include `openid` | Default `openid`, `profile`, `email` |
| `Oidc:*:AllowedClaimTypes` | Non-empty array of claim types usable in `claim` assignments | Default Entra `roles`, `groups`; Cognito `cognito:groups` |
| `Network:TrustedProxies` | Array of IP addresses whose `X-Forwarded-For`/`X-Forwarded-Proto` headers are trusted | Default empty |
| `Network:TrustedNetworks` | Array of CIDR ranges trusted like `TrustedProxies` | Default empty |
| `Audit:RetentionDays` | Integer 1-3650 | Default 90 |
| `Environments` | Non-empty array of `{Id, DisplayName, Label?}`; unique configuration IDs; `DisplayName` 1-100 scalars; optional `Label` 1-32 scalars shown as text (for example `Production`) | Required |
| `Gateways` | Non-empty array of the Gateway registrations below; unique configuration IDs | Required |
| `Gateways[]:Id`, `DisplayName`, `EnvironmentId` | Configuration ID; 1-100 scalars; must name a configured environment | Required |
| `Gateways[]:BaseUrl` | Absolute `https` URL with empty path or `/`, no query or fragment | Required |
| `Gateways[]:ReaderKeyFile`, `OperatorKeyFile` | Paths to the reader-tier and operator-tier API key files | Required |
| `Gateways[]:Tls:CaCertificateFile` | Optional PEM bundle trusted for this Gateway only, in addition to system trust. Certificate validation is never disabled. | Optional |
| `Gateways[]:Bounds:<Name>:Default`, `:Max` | Integers with `1 <= Default <= Max`. Names and UI ceilings for `Max`: `Limit` <= 1,000; `MaxScan` (no UI ceiling); `MaxMatches` <= 1,000; `MaxBytes` <= 10,000,000; `MaxTimeMs` <= 25,000 (30-second read deadline minus 5 seconds); `ThroughputSampleSeconds` <= 60. Each request field is validated against the bound with the same name. `Default` and `Max` must not exceed the deployed Gateway's configured ceilings, confirmed in deployment acceptance; the UI may be stricter (section 16.1). | All six required |

Example values in `config/` and Helm use the FUNC-SPEC section 2.6 baseline: `Limit` 100/1,000, `MaxScan` 10,000/10,000, `MaxMatches` 100/1,000, `MaxBytes` 10,000,000/10,000,000, `MaxTimeMs` 10,000/10,000, `ThroughputSampleSeconds` 5/60. Configuration remains restart-only (section 7.5).

### 14.4 Audit Operation Vocabulary and Target Allowlist (F5)

`AuditEvents.operation` and `AuditEventView.operation` take exactly these values, and the audit-history `operation` filter accepts only these values (anything else returns 400):

| Operation value | Recorded for |
|---|---|
| Each of the 46 active Gateway permission literals, for example `gateway.t7` | That Gateway operation: preview (`dryRun=true`), execution, emergency or override reads, and denials |
| `app.auth.login` | SSO callback and emergency login success or failure (`authSource` distinguishes) |
| `app.auth.logout` | Logout |
| `app.session.read`, `app.session.activity` | Emergency-identity session reads and activity |
| `app.permissions.list`, `app.roles.list`, `app.assignments.list`, `app.clusters.list`, `app.audit.list`, `app.audit.read` | Emergency-identity reads of those endpoints, and denials |
| `app.role.create`, `app.role.update`, `app.assignment.create`, `app.assignment.update` | Access changes, including stale-revision and denial outcomes |
| `app.recovery.reconcile` | The maintenance reconciliation ATTEMPT/RESULT (addendum section 6) |

A denial records the operation the caller attempted, with outcome `denied`. `targetJson` contains only these allowlisted fields, when applicable:

- **Gateway operations:** the UI path parameters (`brokerId`, topic `name`, `partition`, `offset`, `groupId`/`target`, SCRAM `name`); the single confirmation target; S1 `mechanism`; S2 quota entity descriptor; G7 `sourceGroup`; T8 `pattern` and resolved-target count; C9/C12/T6/M5/M6 item counts; M1/M3/M4 `partition`, `from`, `to`.
- **Never recorded:** message keys, values, or headers; regex and JSONPath expressions and values; plan tokens; passwords; configuration values.
- **Application events:** `providerId` (login); `roleId` and `name` (roles); `assignmentId`, `roleId`, `scopeKind`, `scopeId`, `enabled` (assignments); `eventId` (`app.audit.read`); `incidentId`, reconciliation manifest SHA-256, and `approvalReference` (`app.recovery.reconcile`, section 14.11); list reads have an empty target.

### 14.5 V1 Error Envelope (F6)

The v1 error envelope is exactly `{code, message, status, requestId, fieldErrors?, upstreamCode?, outcome}`. The optional `progress` field from addendum section 3.4 is deferred with M8 and is not emitted. For outcome `failed`, preserved information is limited to `fieldErrors`, `upstreamCode`, and the sanitized message; per-item results of partial successes stay in the HTTP 207 success payload. The catalog adds `UPSTREAM_OPERATION_UNAVAILABLE` (502) under section 14.2.

### 14.6 Instance and Maintenance Exclusivity (F7)

- Before readiness, the web server takes an exclusive, non-blocking OS file lock on `{Operations:StatePath}/instance.lock` and holds it for the process lifetime. In PostgreSQL mode it also takes `pg_try_advisory_lock(0x4B334F5549000001)` on a dedicated connection outside the EF Core pool, held for the process lifetime. If either lock is unavailable, the server logs a sanitized error and exits non-zero without becoming ready. If the advisory-lock connection is lost, the server marks itself not ready, stops admitting work, drains under section 8.6, and exits non-zero.
- Every maintenance command takes the same file lock and, in PostgreSQL mode, the same advisory lock, both non-blocking. Failure exits with code 3. This replaces the addendum's "deployment-level exclusive lease". Its SQLite exclusive local lock remains.
- Operator procedure: scale the Deployment to 0 replicas, wait for pod termination, then run the maintenance command as a Kubernetes Job that mounts the same volumes and secrets. The Helm chart ships this Job template disabled by default, uses the `Recreate` deployment strategy with one replica, and mounts `Operations:StatePath` from a `ReadWriteOnce` volume.

### 14.7 HTTP Security Headers (F8)

Every application response (pages, static assets, API, errors, redirects, and health) carries:

| Header | Value |
|---|---|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'` |
| `Strict-Transport-Security` | `max-age=31536000` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `no-referrer` |
| `X-Frame-Options` | `DENY` |
| `Cross-Origin-Opener-Policy` | `same-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |

Client markup must not use inline scripts, inline event handlers, or inline `style` attributes, including the template `index.html` error UI; use CSS classes in self-hosted stylesheets. Relaxing the policy requires a specification change. Existing `Cache-Control: no-store` rules are unchanged.

### 14.8 Internal Metrics Endpoint (F10)

- A second Kestrel listener on port 9090 serves only `GET /metrics` in Prometheus text exposition format 0.0.4, implemented in the Server project without a new dependency. It has no authentication and no ingress route; the Helm chart exposes it only through a separate ClusterIP `metrics` port. The application listener on 8080 returns 404 for `/metrics`.
- Metrics carry no identity, cluster, target, or secret labels: `kafka3o_ui_audit_retention_failures_total` (counter) and `kafka3o_ui_audit_retention_last_success_timestamp_seconds` (gauge, initialized to process start time so that no successful run within 2 hours alerts).
- The Helm chart ships the addendum section 4.4 alert rules as `files/alerts.yaml`, and as an optional `PrometheusRule` template (disabled by default): alert when the failure counter increases within 1 hour, or when `time() - last_success > 7200`.

### 14.9 UX Baseline and Browser Routes (F4, F9)

DESIGN-SPEC revision 0.9 is approved as the v1 UX and visual baseline. Its section 14 fixes browser routes and icon/font sourcing. The server serves the Client `index.html` for GET requests that match no static file and are not under `/api/`, `/signin-oidc/`, or `/health/`; unknown `/api/` paths keep the JSON 404 `NOT_FOUND` convention.

### 14.10 Verification Additions

In addition to sections 4 and 13.3 and addendum section 11.4, required tests cover:

- unavailable-operation classification (non-envelope 404/405 versus envelope `NOT_FOUND`) with zero retries;
- configuration validation for every constraint in section 14.3, with no secret values in startup diagnostics;
- the audit operation vocabulary, filter rejection of unknown values, and target allowlist enforcement (no regex, JSONPath, payload, token, or password content);
- absence of `progress` in error envelopes;
- a second server instance and maintenance commands refused while the locks are held (both providers), and not-ready plus exit on loss of the advisory-lock connection;
- exact security headers on every response class, framing refusal, and zero CSP violations across Playwright workflows;
- the metrics endpoint listening only on 9090, with the counter and gauge behaving as specified;
- browser routes and deep links per DESIGN-SPEC section 14, including the SPA fallback exclusions;
- strict manifest validation per section 14.11: unknown fields, hash mismatch, installation/provider/migration mismatch, stale expected revisions, omitted or added IDs, and credential-version mismatch each fail with the specified exit code and change nothing.

These are required implementation checks, not tests run for this documentation change.

### 14.11 Maintenance Manifest Schemas (F11)

Found during the re-audit and confirmed with the Step 8 sign-off. Both manifests are UTF-8 JSON files validated strictly by the maintenance commands (addendum section 6): unknown fields, missing fields, or wrong types exit with code 2; any mismatch below exits with code 4; nothing is changed on failure. File paths inside a manifest are relative to the manifest's directory. The operator writes the backup manifest while following the documented backup procedure; `scripts/` may provide a helper, which is not a new maintenance command.

| Backup manifest field (`--backup-manifest`) | Type and validation |
|---|---|
| `schemaVersion` | Integer `1` |
| `installationId` | UUID; must equal the installed key manifest's installation ID |
| `createdAt` | `Instant` |
| `provider` | `Sqlite` or `PostgreSql`; must equal `Database:Provider` |
| `appliedMigrations` | Ordered array of EF Core migration IDs; must equal the database's applied-migration history before migrating |
| `databaseBackup` | `{path, sha256, tool, toolVersion}`; `sha256` is 64 lowercase hex digits and must match the file |
| `keyRingBackup` | `{path, sha256}`: a tar archive of the key-ring directory and key manifest; hash must match |

| Reconciliation manifest field (`--manifest`) | Type and validation |
|---|---|
| `schemaVersion` | Integer `1` |
| `installationId`, `incidentId` | UUIDs; must equal the key manifest and the pending recovery marker |
| `backupManifestSha256` | 64 lowercase hex digits of the backup manifest used for the restore |
| `expectedRoles`, `expectedAssignments` | Arrays of `{id, revision}`; must equal exactly the restored rows (IDs and revisions), otherwise the state is stale |
| `desiredRoles` | Array of `{id, name, permissionIds}` validated like `RoleInput`; must contain every expected role ID and no other |
| `desiredAssignments` | Array of `{id}` plus `AssignmentInput` fields; must contain every expected assignment ID and no other |
| `emergencyCredentialVersion` | Must equal the configured `Emergency:CredentialVersion` |
| `approvalReference` | 1-256 Unicode scalars, no control characters; recorded in the reconciliation audit target |

Reconcile applies the desired values with new revisions, revokes every session, and records the audit RESULT in the same transaction (addendum section 6). New roles or assignments are created through the application after recovery, never by reconciliation. The audit target records `incidentId`, the reconciliation manifest SHA-256, and `approvalReference`, never role or assignment contents.

## 15. Spec Audit (Pipeline Step 8)

Audit date: 2026-09-26. Signed off by the user ("approve sign-off") on 2026-09-26. Scope: FUNC-SPEC 0.7, TECH-SPEC 0.17, CONSOLIDATED-PROPOSAL 0.7, and DESIGN-SPEC 0.9, audited in full for the reduced-v1 scope. Every earlier `STATUS: BLOCKED` record in this specification and the addendum is superseded by this audit.

### 15.1 Verdict

| Dimension | Status |
|---|---|
| Design readiness | `STATUS: READY`. Requirements and implementation-defining contracts are complete, consistent, and deterministic for v1 (40 command IDs / 46 operations / 49 permission literals, 16 application routes, 26 active pages). Testing strategy and mandatory compatibility/security release gates are defined. Step 9 task creation is permitted. |
| Release verification | `PENDING`. No build, test run, dependency audit, or artifact/container scan exists. No component is certified free of known vulnerabilities. This sign-off waives no release gate. |

### 15.2 Findings and Resolution

| ID | Finding | Resolution |
|---|---|---|
| F1 | Superseded replay/continuation/47-operation/B1-B2 text still live in all four documents | Struck through with v1 replacements (section 14.1) |
| F2 | Supported-operation state required runtime OpenAPI discovery with no route, permission, or detection mechanism | Per-call classification, no runtime discovery; release-time OpenAPI comparison (section 14.2) |
| F3 | No deployment configuration schema | `Kafka3O` configuration schema (section 14.3) |
| F4 | UX design was an unapproved draft | DESIGN-SPEC 0.9 approved as the v1 UX/visual baseline (section 14.9) |
| F5 | Audit operation values and target fields undefined | Fixed vocabulary and allowlist (section 14.4) |
| F6 | Error-envelope `progress` field ambiguous in v1 | Omitted in v1 (section 14.5) |
| F7 | Maintenance exclusivity had no mechanism | Instance file lock and PostgreSQL advisory lock (section 14.6) |
| F8 | HTTP security headers unspecified | Exact header set and CSP constraints (section 14.7) |
| F9 | No browser routes or deep-link URL shape | DESIGN-SPEC section 14.1, confirmed with sign-off |
| F10 | Retention metric and alert defined but never exposed | Internal metrics endpoint and Helm alert rules (section 14.8), confirmed with sign-off |
| F11 | Maintenance manifests had content lists but no schema | Strict manifest schemas (section 14.11), confirmed with sign-off |

Verified against the pinned Gateway revision `91b7a24` (read-only): M1/M3/M4 accept one optional integer `partition` and `from`/`to` selector strings, so the reduced-v1 selection contract is implementable; unmatched Gateway routes fall through to the standard Go router (non-JSON 404/405), supporting the section 14.2 classification.

### 15.3 Deferred by Design (Not V1 Requirements)

M8 replay/re-drive; latest-N, beginning/timestamp, multi-partition, and resumable M1/M3/M4; message-workflow routes, tokens, and memory manager (sections 12.4-12.6, addendum section 8); B1/B2 adapter proof; multi-replica deployment; dark mode. Reintroduction requires explicit scope approval, complete contracts, and compatibility proof.

### 15.4 Outstanding Release Evidence and Implementation-Time Selections

Required before release under sections 1.6, 4, 13.3, and addendum section 11.4, and not claimed by this audit:

1. Pin test tooling, container base images and digests, Helm version, and the supported Kubernetes matrix; resolve lockfiles; generate an SBOM.
2. Build and test the full stack; verify the SQLite engine identity in the target image and both provider migration sets.
3. All-severity zero-CVE scans of direct, transitive, native, build, container, and deployed-database components, with retained evidence.
4. Real Gateway/Kafka integration across two environments, including the 17 empty-confirm previews against the deployed Gateway, large-offset precision, and a served-OpenAPI comparison with the pinned fixture.
5. Opt-in real IdP checks; restore drill; certificate rotation with backup decryption; alert delivery; security headers and CSP in real browsers.
6. License and notice review of the final dependency graph and vendored fonts/icons.
7. Agreed numeric performance workloads and limits before any performance gate is enforced.

### 15.5 Handoff

Step 9 may create `TASKS.md` from these approved specifications. Keep diff markup until each marker has produced a task action. This audit ran documentation consistency checks and read-only Gateway source inspection only; no application code, Gateway files, tests, credentials, or deployed resources changed.

## 16. Approved Step 9 Clarifications

Approved by the user with the Step 9 task plan on 2026-09-26. These clarifications close gaps found while decomposing the approved specifications into tasks. They add no Gateway change and no feature beyond the reduced-v1 scope in section 13.

### 16.1 S1: Per-Cluster Bound Limits

Each `Gateways[]:Bounds:<Name>` `Default` and `Max` must not exceed the deployed Gateway's configured ceilings, confirmed in deployment acceptance. The UI ceilings in section 14.3 still apply, so the UI may be stricter than the Gateway. This replaces the earlier "must equal" wording: the Gateway ships ceilings (for example `max_scan` 100,000, `max_bytes` 100 MiB, `max_time` 60 s) above the UI ceilings, which made that rule unsatisfiable.

### 16.2 S2: Emergency Password Hash Command

`maintenance emergency hash-password [--iterations <n>]` reads the password from standard input (never from arguments), accepts 1-4096 UTF-8 bytes without normalization, and prints only an ASP.NET Core Identity V3 PBKDF2-HMAC-SHA512 hash with at least 210,000 iterations; `--iterations` may only raise the count. It loads no `Kafka3O` configuration and takes no instance locks. Exit codes: 0 success, 2 invalid input.

### 16.3 S3: Initial Database Migration

`maintenance database migrate` takes exactly one of `--initial` or `--backup-manifest <path>` (otherwise exit 2). `--initial` is allowed only when the database has no migration history and no application tables; otherwise it exits 3 without changes. Every non-empty database requires `--backup-manifest` validated under section 14.11. All other migrate rules in addendum section 6 (stopped application, exclusivity, forward-only, stay stopped on failure) are unchanged.

### 16.4 S4: Cluster Directory Environment Fields

`ClusterView` is `{id, environmentId, environmentDisplayName, environmentLabel?, displayName, permissionIds}`. The environment display name and optional label come from the `Environments` configuration (section 14.3). `GET /clusters` still makes no Gateway call and returns no URL, secret reference, credential, or health data. This amends addendum section 3.1.

### 16.5 S5: Lock-Override Reason Transport

The browser sends a lock-override reason in the `X-Break-Glass-Reason` header on the single UI request for an M1-M7 operation. The backend never forwards it blindly:

- Header absent: no override.
- Header present: the caller must hold the operation permission and `gateway.lock.override` for that cluster, otherwise 403 `PERMISSION_DENIED` with a denial event and zero Gateway calls. The reason must be non-empty, at most 512 UTF-8 bytes, and free of control characters, otherwise 400 `VALIDATION_FAILED`.
- The header on any other operation returns 400.
- A valid reason is forwarded as `X-Break-Glass-Reason` only on that request and recorded as the audit `overrideReason`. It is not persisted elsewhere and is never inherited by later requests.

### 16.6 Audit Addendum

Step 8 audit addendum, 2026-09-26: S1-S5 are consistent with sections 13-15, resolve the gaps found during Step 9 task planning, and introduce no Gateway or scope change. Design status remains `STATUS: READY`; release verification remains `PENDING`. Step 9 may consume the diff markup in FUNC-SPEC and TECH-SPEC once every marker has produced a task action in `spec/TASKS.md`.
