# Technical Specification

**Product:** Kafka3O-UI
**Version:** ~~0.2~~ ~~0.3~~ ~~0.4~~ ~~0.5~~ ~~0.6~~ **[NEW]** 0.7
**Date:** ~~2026-09-22~~ **[NEW]** 2026-09-24
**Status:** ~~Technology and minimalist design-pattern baselines approved by the user; compatibility and release security verification pending~~ ~~Technology, minimalist design-pattern, and SOLID baselines approved by the user; compatibility and release security verification pending.~~ ~~Technology, design-pattern, SOLID, and testing-strategy baselines approved by the user; test-tool version pins, compatibility, and release security verification pending.~~ **[NEW]** Technology, design-pattern, SOLID, testing-strategy, and topology baselines approved by the user; test-tool version pins, compatibility, and release security verification pending.
**Pipeline:** ~~Steps 3 and 4 completed. Detailed contracts, further architecture refinement, test design, and implementation remain subsequent steps.~~ ~~Steps 3 through 5 completed. Detailed contracts, further architecture refinement, test design, and implementation remain subsequent steps.~~ ~~Steps 3 through 6 completed. Detailed contracts, topology, executable test definitions, and implementation remain subsequent steps.~~ **[NEW]** Steps 3 through 7 completed. Spec audit, resolution of outstanding design details, executable task/test definitions, and implementation remain pending.
**Functional baseline:** [FUNC-SPEC.md](FUNC-SPEC.md), revision ~~0.2~~ **[NEW]** 0.3.

## 1. Technology Stack

### 1.1 Classification and Approved Constraints

**[NEW]** Kafka3O-UI is an open-source project deployed on Kubernetes. Frontend and backend are delivered as one application. The browser communicates only with the UI backend; Kafka management uses configured Kafka3O-Gateway HTTP interfaces exclusively. No direct Kafka client is required.

**[NEW]** Known-vulnerability tolerance is zero at every severity. Approval of this specification is not security clearance or permission to waive the release gates in section 1.6. Incomplete or unavailable vulnerability evidence is not a clean result.

### 1.2 Selected Components

The following are approved baseline version selections, not an executed dependency lock or a tested bill of materials. Any required updates must retain the compatibility and security gates below.

| Layer | Approved selection | Purpose and rationale |
|---|---|---|
| Language and build | **[NEW]** C# with .NET SDK **10.0.401**, targeting `net10.0` | One language and build ecosystem for backend and frontend. Pin the SDK for reproducible builds. |
| Backend | **[NEW]** .NET runtime and ASP.NET Core **10.0.12** | HTTP API, authentication, authorization, validation, Gateway HTTP clients, and static frontend hosting. |
| Frontend | **[NEW]** Blazor WebAssembly **10.0.12**, served by the backend | Browser UI in C# without requiring a persistent server-side UI connection. The browser is never an authorization authority. |
| Persistence | **[NEW]** Entity Framework Core **10.0.12** | Persist roles, assignments, sessions, and audit records with provider-specific migrations and equivalent functional behavior. |
| SQLite provider | **[NEW]** `Microsoft.EntityFrameworkCore.Sqlite` and `Microsoft.Data.Sqlite` **10.0.12** | Embedded storage option for small, single-replica deployments. |
| SQLite native packaging | **[NEW]** `SQLitePCLRaw.bundle_e_sqlite3` **3.0.5** and native `SQLite` package **3.53.4** | Explicit native-engine selection; the EF provider version alone does not identify or clear the native SQLite library. |
| External database | **[NEW]** PostgreSQL **18.6** | ~~Supported external storage option, recommended for production and multiple application replicas. Other external database products are not selected.~~ **[NEW]** Supported external storage option, recommended for production with one application replica in the first release. Other external database products are not selected. |
| PostgreSQL access | **[NEW]** `Npgsql.EntityFrameworkCore.PostgreSQL` **10.0.3** and `Npgsql` **10.0.3** | EF provider and database driver. The provider's declared EF range includes 10.0.12. |
| Authentication | **[NEW]** ASP.NET Core OIDC and cookie authentication, aligned with **10.0.12** | Separate Entra ID and Cognito schemes; server-side authorization-code exchange with PKCE and server-side sessions. |
| Packaging | **[NEW]** One Linux application container and a Helm chart for Kubernetes | Backend serves the published WebAssembly assets. No separate Node.js runtime, Redis service, or identity server is required. |

**[NEW]** Microsoft packages selected for these layers must align to 10.0.12 where applicable, including `Microsoft.AspNetCore.Authentication.OpenIdConnect`, `Microsoft.AspNetCore.Components.WebAssembly`, and `Microsoft.AspNetCore.Components.WebAssembly.Server`. Complete transitive pins are produced and audited during implementation; package version ranges must not substitute for a resolved lockfile.

**[NEW]** Container distribution, image tags and immutable digests, Helm tool version, and supported Kubernetes versions remain unselected. Do not invent image digests or claim a tested deployment matrix. Resolve and validate them before release; the SDK belongs in the build stage, not the application runtime image.

### 1.3 Storage and Deployment Constraints

- **[NEW]** SQLite mode permits one application replica with durable persistent storage. Deployment upgrades must not introduce overlapping application replicas against the same SQLite file. Multi-node shared-file SQLite is not a supported scale-out design.
- ~~PostgreSQL mode permits multiple application replicas once shared session state, revocation, authorization freshness, and cookie/Data Protection key persistence are designed and tested. Selecting PostgreSQL alone does not establish high availability.~~ **[NEW]** PostgreSQL mode permits exactly one application replica in the first release, with non-overlapping application upgrades. Both SQLite and PostgreSQL remain supported. Multi-replica deployment is deferred to a separately approved capability requiring shared-session, revocation, authorization-freshness, throttling, and key-management design and tests. Restart persistence remains required in either database mode; one replica does not imply high availability.
- **[NEW]** Both database modes must pass the functional persistence, expiry, role-change, audit-gate, retention, and restart requirements. Provider-specific schema and migration differences must be handled explicitly.
- **[NEW]** Gateway registrations and secret references remain deployment configuration. Neither database mode introduces runtime Gateway registry editing.
- **[NEW]** Gateway credentials, OIDC tokens, and password material remain backend-only. Both OIDC providers coexist; the single emergency account retains the same audit and Gateway safeguards as specified in the functional baseline.
- **[NEW]** Sessions default to **4 hours idle** and **8 hours absolute**, with passive polling excluded from indefinite idle renewal. Cookie middleware defaults alone do not establish compliance; enforce and test server-side expiry and revocation.

### 1.4 Support and Licensing

| Component | Support policy and license evidence |
|---|---|
| .NET / ASP.NET Core / Blazor 10 | **[NEW]** .NET 10 is LTS, supported through **2028-11-14**, subject to vendor servicing requirements. Microsoft framework packages use MIT licensing. |
| EF Core 10 | **[NEW]** Follow Microsoft's EF Core servicing and support policy alongside the selected .NET generation; MIT licensing. |
| PostgreSQL 18 | **[NEW]** Five-year major-version support through **2030-11-14**, with minor updates required. This is not a separate LTS release channel. PostgreSQL license. |
| Npgsql | **[NEW]** Maintainer-supported stable packages, without an equivalent formal .NET LTS guarantee. PostgreSQL license. |
| SQLite | **[NEW]** Maintained stable engine, not a per-release LTS channel. The native package's license page declares SQLite public domain. |
| SQLitePCLRaw | **[NEW]** Maintainer-supported wrapper/bundle, without a formal LTS guarantee. Apache-2.0 licensing. |

**[NEW]** The non-LTS support-policy distinctions above are explicitly accepted for this baseline. SQLite's long-term project support intent does not guarantee maintenance of an individual pinned release. No paid SQLite encryption extension or paid support subscription is selected. License and notice review must cover the final transitive dependency graph and container packages, not just this table.

### 1.5 Compatibility and Advisory Review

**[NEW]** Review status: preliminary upstream release, package-metadata, and advisory review only. No application restore, build, database integration test, full dependency vulnerability scan, or container scan has been executed. No component is certified free of all known vulnerabilities by this document.

| Area | Evidence and remaining limitation |
|---|---|
| Microsoft stack | **[NEW]** Retrieved .NET 10.0.12 release notes identify SDK 10.0.401 and security fixes. Release notes and support status are not a complete vulnerability verdict for a resolved application. |
| Npgsql compatibility | **[NEW]** Provider 10.0.3 declares EF Core `>= 10.0.4 && < 11.0.0` and Npgsql `>= 10.0.3`. EF Core 10.0.12 satisfies that range; this is metadata compatibility, not an executed test. |
| Npgsql advisory | **[NEW]** `CVE-2024-32655` / `GHSA-x9vc-6hfv-hg8c` is a High-severity protocol-message-size overflow SQL injection issue. Candidate driver 10.0.3 is outside its listed affected ranges. That single advisory does not clear other or transitive dependencies. |
| PostgreSQL | **[NEW]** The reviewed security table lists fixes included in 18.6. Recheck all applicable advisories against the actual deployed database build, including externally operated instances. |
| SQLite packaging | **[NEW]** Bundle 3.0.5 declares `SQLite >= 3.53.4` and `SQLitePCLRaw.config.e_sqlite3 >= 3.0.5`; the configuration package references the platform provider. The native SQLite package identifies engine version 3.53.4. Resolve and audit the complete managed/native graph and verify the loaded engine in the target Linux image. |
| SQLite advisories | **[NEW]** The reviewed upstream table identifies `CVE-2026-11822` and `CVE-2026-11824` as fixed in 3.53.2, preceding the selected 3.53.4 engine. Upstream applicability commentary is not an automatic exception to the zero-tolerance policy. |
| Container and remaining dependencies | **[NEW]** Not audited. No image digest or complete dependency inventory exists yet. Security verification remains pending and release-blocking. |

### 1.6 Mandatory Verification and Release Gates

1. **[NEW]** Pin and restore the full dependency graph, including native SQLite assets and build/test tooling. Preserve the resolved lockfiles and generate an SBOM for the delivered application/image.
2. **[NEW]** Build and test the selected SDK/runtime/packages together. Verify SQLite engine identity inside the target container, provider loading, and migration/persistence behavior on SQLite and PostgreSQL. Reject incompatible combinations rather than assuming NuGet version-range compatibility is sufficient.
3. **[NEW]** Scan direct, transitive, native, and container/OS dependencies against current vulnerability data. Include build dependencies and the deployed database version. Preserve scanner version, database freshness, timestamp, component versions, artifact digest, and findings as evidence.
4. **[NEW]** Block release for known vulnerabilities at every severity, including vulnerabilities without available fixes. Unclassified findings require resolution before release. Missing, stale, failed, or incomplete audit results block release; a scanner's lack of native-library coverage must not silently pass SQLite.
5. **[NEW]** Select supported Linux base images, scan the actual built images, and pin immutable digests. Scan each published platform variant. Verify the Helm deployment against an explicitly documented supported Kubernetes matrix.
6. **[NEW]** Recheck advisories and rebuild/rescan after dependency or base-image changes and before each release. New findings require remediation and repeat validation; this baseline is not permanent security clearance.
7. **[NEW]** Keep test environments isolated: only explicitly designated integration tests may contact real Gateways. Normal backend/component/browser tests use recording HTTP fakes and mock OIDC providers. No tests have been executed as part of stack selection.

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

**[NEW]** Subsequent design must define application boundaries, concrete browser/backend contracts, migrations, server-side session storage, Data Protection key management, password hashing, audit durability/recovery, polling/deadlines, configuration rotation, and test tooling. This stack decision does not resolve Gateway contract ambiguities or expand functional scope.

| Version | Date | Change |
|---|---|---|
| 0.1 | 2026-09-22 | User-approved open-source .NET/Blazor/EF Core baseline, SQLite/PostgreSQL options, Kubernetes packaging, support-policy distinctions, preliminary advisory evidence, and mandatory pending verification gates. |
| 0.2 | 2026-09-22 | **[NEW]** Appended the user-approved Step 4 minimalist architecture and design patterns, source-based extensibility, internal feature modules, implementation rules, exclusions, and verification criteria. Stack selections and security gates unchanged. |
| 0.3 | 2026-09-22 | **[NEW]** Appended the user-approved Step 5 SOLID constraints, illustrative code-level examples, and verification requirements. Stack selections, functional scope, and security gates unchanged. |
| 0.4 | 2026-09-22 | **[NEW]** Appended the user-approved Step 6 testing strategy, framework selections, coverage floors, V1-V20 traceability, execution gates, and performance-baseline approach. Exact test-tool pins and compatibility/security validation remain pending. |
| 0.5 | 2026-09-24 | **[NEW]** Appended the user-approved Step 7 feature-first topology, three production projects, dependency boundaries, test alignment, and configuration/deployment locations. No application scaffolding; outstanding design and verification gates unchanged. |
| 0.6 | 2026-09-24 | **[NEW]** Recorded approved audit remediation direction: separate design readiness from release verification, restrict the first release to one application replica with either database, and authorize proposals and read-only Gateway contract investigation. No readiness sign-off or security clearance. |
| 0.7 | 2026-09-24 | **[NEW]** Recorded approved security/persistence design, API and operational direction, and Gateway count/health-route compatibility decisions. Detailed contracts and upstream continuation/dry-run compatibility remain blocked; no application tests or security clearance. |

Future stack revisions preserve superseded definitions with `~~strikethrough~~` and prefix replacement choices with `**[NEW]**`.

## 2. Design Patterns

### 2.1 Approved Extensibility and Macro-Architecture

**[NEW]** New workflows and integrations are added through source changes and rebuilds. Features remain internal modules released together; runtime third-party plugins and independently versioned modules are not required.

~~Use a modular monolith: one ASP.NET Core backend serves the Blazor WebAssembly frontend, packaged as the single application defined in section 1. Internal modularity does not introduce separate services or deployments. SQLite remains single-replica; PostgreSQL scale-out remains subject to the shared-state and verification requirements in section 1.3.~~ **[NEW]** Use a modular monolith: one ASP.NET Core backend serves the Blazor WebAssembly frontend, packaged as the single application defined in section 1. Internal modularity does not introduce separate services or deployments. Both database modes require one application replica and non-overlapping upgrades in the first release; PostgreSQL scale-out is deferred as specified in section 1.3.

### 2.2 Essential Boundaries and Justification

| Choice | Concrete problem solved | Simpler alternative and why it is insufficient |
|---|---|---|
| Backend-for-frontend boundary | **[NEW]** Keeps Gateway credentials, OIDC token handling, authorization, and audit enforcement server-side. This is an existing functional requirement, not an additional service. | Direct browser-to-Gateway calls expose credentials and cannot provide the required trusted user-level enforcement. |
| Internal feature modules | **[NEW]** Separates identity/access, Kafka operation workflows, and audit functionality while retaining one release unit. Folders and namespaces suffice initially; a separate project per feature is not required. | One undifferentiated module would mix security rules and 47 command-operation workflows, making ownership and review harder. |
| Built-in dependency injection with narrow external adapters | **[NEW]** Makes Gateway transport, persistence, and time replaceable for deterministic tests and failure injection, and centralizes upstream protocol handling. Use framework facilities where they suffice. | Hard-wired external dependencies prevent fake-only normal tests and reliable failure simulation. An interface for every class would add no corresponding value. |

### 2.3 Workflow and Integration Rules

- **[NEW]** Implement workflows as ordinary application-service methods. Share session, authorization, validation, and audit enforcement through direct calls to focused services; no custom pipeline or workflow engine is required.
- **[NEW]** Every Gateway call, including destructive previews, downloads, bulk requests, and each replay batch, independently checks the session, operation permission, configured cluster, inputs, and applicable audit requirements. Browser visibility is never enforcement, and HTTP verb alone does not classify mutations.
- **[NEW]** Mutations and lock overrides persist `ATTEMPT` before forwarding and `RESULT` afterward. Audit-attempt failure prevents execution; result-persistence failure after execution never triggers a retry or a rollback claim. Role/assignment changes retain the same fail-closed audit requirement. Other audit obligations, including emergency-account reads and destructive previews, remain governed by the functional specification.
- **[NEW]** Place Gateway HTTP details in a typed client: configured destination resolution, appropriate credential tier, safe path encoding, numeric-safe serialization, correlation IDs, and error translation. Credentials are selected only after authorization. Do not expose an arbitrary proxy endpoint or accept browser-supplied upstream URLs or authorization headers.
- **[NEW]** Preserve Gateway confirmation tokens, safety controls, scan continuation, and per-item outcomes. Do not automatically retry ambiguous mutations. Reuse the same enforcement for each bounded replay batch; no durable background replay job is introduced.
- **[NEW]** Identity/access owns authentication and effective permission evaluation; Kafka application services own operation orchestration; audit functionality owns recording and authorized history access. These responsibilities communicate through in-process calls, not a message bus.

### 2.4 Persistence and Browser State

- **[NEW]** Use EF Core directly within persistence implementations. Introduce only focused storage interfaces needed by application behavior and test isolation; do not add a generic repository or an extra unit-of-work layer over EF Core.
- **[NEW]** Choose SQLite or PostgreSQL through EF provider configuration at startup. Handle provider-specific migrations explicitly; do not create a custom database strategy framework. Both modes must retain equivalent functional persistence semantics.
- **[NEW]** Keep browser state within components or feature-scoped services. Bind drafts, previews, results, and continuation to the selected cluster; switching clusters invalidates incompatible state and prevents late responses from appearing as the new cluster's data.
- **[NEW]** Browser state contains no Gateway credentials, OIDC tokens, or persisted password material. It cannot replace backend session validation or permission checks. No separate global state-management framework is selected.

### 2.5 Deliberately Excluded Patterns

**[NEW]** Do not introduce microservices, runtime plugins, a mediator library, a CQRS framework, event sourcing, a message bus, or a custom workflow engine. The approved workflows require neither independently deployed features nor asynchronous command infrastructure. Ordinary methods, framework services, and narrow adapters provide the required organization and testability with fewer abstractions.

**[NEW]** Audit history is an accountability record, not an event-sourced application model. It does not reconstruct application state or authorize automatic replay of mutations. New abstractions require a concrete demonstrated need and must not silently expand the approved scope.

### 2.6 Verification and Handoff

The following are required implementation checks, not tests executed during this documentation step:

| Check | Required evidence and functional traceability |
|---|---|
| Enforcement cannot be bypassed | **[NEW]** Recording Gateway fakes observe zero target-operation calls on session/permission denial or required audit-attempt failure, including previews and replay batches; role changes do not execute on audit-attempt failure. Covers V4-V6, V10, V15, and V17. |
| Dependency isolation | **[NEW]** Normal tests use recording HTTP fakes, mock OIDC issuers, controlled clocks, and appropriate storage substitutes. Only explicitly designated integration tests contact real Gateways. Covers D9, V8, and V19. |
| Persistence equivalence | **[NEW]** SQLite and PostgreSQL pass equivalent session, role, audit, retention, and restart checks; fake tests do not substitute for provider integration evidence. Covers O7 and V18. |
| Mutation outcome safety | **[NEW]** Inject ambiguous transport failure and post-execution audit failure; observe no automatic retry, duplicate execution, or rollback claim. Covers V15 and V17. |
| Browser boundary | **[NEW]** Browser tests verify secret isolation, cluster-bound state invalidation, and rejection of late responses for a previous cluster. Covers V9 and V16. |

**[NEW]** Subsequent steps define concrete service contracts, schemas, dependency lifetimes, session/key storage, audit durability, and executable tests. Section 1 version selections, pending compatibility evidence, and all-severity security gates remain unchanged. No application code or new dependency is introduced by this section.

Future pattern revisions preserve superseded definitions with `~~strikethrough~~` and prefix replacement choices with `**[NEW]**`.

## 3. SOLID Constraints

**[NEW]** These constraints apply within the approved modular monolith and do not require an interface for every class. Names in the examples are illustrative, not finalized APIs or implemented symbols.

### 3.1 Single Responsibility

**[NEW]** Endpoints handle HTTP binding and responses; application services coordinate workflows; authorization, audit persistence, and Gateway transport remain separate responsibilities. Blazor components must not implement trusted authorization or persistence.

**[NEW]** Code-level example: `ReplayService.ExecuteBatchAsync(...)` coordinates permission checks, audit recording, and a typed Gateway call without containing SQL or rendering logic.

### 3.2 Open/Closed

**[NEW]** Add operations through feature methods, explicit operation metadata, and tests while reusing shared enforcement. New operations must not require operation-specific branches inside session validation or audit persistence. Ordinary source changes, including catalog, route, UI, and registration changes, remain allowed; no plugin framework is introduced. Every new operation retains the session, authorization, validation, and audit requirements in section 2.3.

**[NEW]** Code-level example: Adding a topic operation adds its permission/audit classification and workflow method while leaving `SessionValidator` and `AuditWriter` unchanged.

### 3.3 Liskov Substitution

**[NEW]** Implementations of the same contract must preserve inputs, outcomes, failure semantics, cancellation semantics, and security guarantees. SQLite and PostgreSQL must satisfy the same application-level storage contracts, without requiring identical provider internals. Recording fakes must model relevant failures rather than always returning success; fake behavior does not establish production durability or replace provider integration tests.

**[NEW]** Code-level example: Every production `IAuditWriter.RecordAttemptAsync(...)` implementation returns success only after durable persistence, and an injected failing fake causes zero mutation calls.

### 3.4 Interface Segregation

**[NEW]** Define interfaces around actual consumer needs, not the complete application or Gateway catalog. Separate audit recording from audit querying and expose focused Gateway capabilities where needed. Storage interfaces must not leak `DbContext`, `DbSet`, or `IQueryable`; EF Core remains usable directly within persistence implementations as specified in section 2.4.

**[NEW]** Code-level example: A mutation service depends on `IAuditWriter`, while the audit-history feature depends on `IAuditReader`, without either receiving unused methods.

### 3.5 Dependency Inversion

**[NEW]** Application workflows receive external capabilities through constructor injection using ASP.NET Core DI. Inject focused storage/Gateway contracts and .NET `TimeProvider`; keep EF Core and HTTP implementations behind those boundaries. Do not use a service locator or static mutable dependencies, and do not reference backend infrastructure from Blazor.

**[NEW]** Code-level example: `SessionValidator(ISessionStore sessions, TimeProvider clock)` supports controlled-clock tests without constructing a database context or reading `DateTime.UtcNow` directly.

### 3.6 Verification and Handoff

**[NEW]** Code review and dependency checks must enforce responsibility boundaries, consumer-focused interfaces, and the prohibition on browser references to backend infrastructure. Require focused tests for authorization/audit failures, expiry, adapter contracts, and equivalent SQLite/PostgreSQL behavior, retaining the failure and restart checks in section 2.6. These are implementation requirements, not tests executed during this documentation step.

**[NEW]** No new framework, generic repository, or inheritance hierarchy is required. Concrete contracts and executable test tooling remain subsequent design work. Functional scope, stack selections, and pending compatibility and security release gates remain unchanged; no application code or dependency is introduced by this section.

Future SOLID revisions preserve superseded definitions with `~~strikethrough~~` and prefix replacement rules with `**[NEW]**`.

## 4. Testing Strategy

### 4.1 Approved Approach and Frameworks

**[NEW]** Use risk-based coverage with numeric floors, database integration on pull requests, real Gateway tests nightly and before release, and repeatable performance baselines before setting numeric limits. No fixed unit/integration/end-to-end ratio is imposed: test logic at the cheapest effective layer and use browsers for actual user interactions and browser security behavior.

| Purpose | Approved selection and boundary |
|---|---|
| Unit and workflow tests | **[NEW]** xUnit v3 with built-in assertions; focused storage substitutes, recording Gateway fakes, and controlled `TimeProvider` clocks. |
| Backend API tests | **[NEW]** ASP.NET Core `WebApplicationFactory` with recording Gateway HTTP fakes and mock OIDC issuers, retaining the application middleware and enforcement paths under test. |
| Blazor component tests | **[NEW]** bUnit for component rendering, interactions, and feature-state behavior. |
| Browser tests | **[NEW]** Playwright for .NET against the running application; normal browser suites use fake Gateways and mock OIDC issuers. |
| Database integration | **[NEW]** Temporary SQLite files and disposable PostgreSQL via Testcontainers for .NET, using the selected database/provider baseline. |
| Coverage | **[NEW]** Coverlet collector with the xUnit VSTest adapter; validate discovery, execution, and line/branch collection together on the approved .NET 10 baseline. |

**[NEW]** Exact package versions remain unpinned. Before freezing versions, validate the runner, adapter, coverage collector, bUnit, API host, and browser tooling together with SDK 10.0.401 and the selected .NET 10.0.12 packages. Retain resolved dependency pins and evidence; framework selection is not proof of compatibility. Test tools, browser binaries, and disposable dependency images remain subject to the licensing and zero-CVE gates in section 1. No tooling has been installed or validated by this documentation step.

### 4.2 Coverage and Contract Traceability

- **[NEW]** Enforce minimum **90% line coverage** and **85% branch coverage** for backend authorization, session, validation, audit orchestration, and operation-workflow logic. Define the included code scope explicitly in the executable coverage configuration.
- **[NEW]** Security-critical allow/deny and failure paths require explicit tests regardless of percentages. Generated code and migrations may be excluded from percentage calculations, but migrations still require database integration tests.
- **[NEW]** Maintain traceability for V1-V20 and all 41 command IDs and 47 enumerated operations in the functional baseline. Each operation has a UI workflow, input/output contract assertions, and an authorization test, keyed by command ID and sub-operation identifier.
- ~~Validate method/path and command metadata against the Gateway specification and implemented OpenAPI, distinguishing upstream unavailability from UI omissions. Preserve the unresolved upstream 48-operation claim; do not invent a route or treat unsupported prerequisites as coverage success.~~ **[NEW]** Validate method/path and command metadata against the Gateway specification and implemented OpenAPI, using the approved 41-command/47-operation count and health-path exceptions in section 7.6. Retain the upstream documentation discrepancy as evidence, not an unresolved UI count decision. Do not invent a route or treat unsupported prerequisites as coverage success; other compatibility blockers remain open.

### 4.3 Functional and State-Transition Verification

| Functional surface | Verification IDs | Required tests |
|---|---|---|
| Authentication and sessions | V2, V3, V4, V5, V6, V7 | **[NEW]** Both mock OIDC providers in one deployment; invalid protocol inputs; issuer/subject identity separation; permission unions; emergency login and audit; CSRF; controlled-clock 4-hour idle and 8-hour absolute expiry; passive polling, logout, rotation, and revocation. |
| Authorization and audit gates | V4, V5, V17 | **[NEW]** Permission/session denial or required audit-attempt failure produces zero target-operation calls; role changes also fail closed. Role/mapping changes affect the next request and replay batch. |
| Gateway contracts and isolation | V1, V8, V11, V19 | **[NEW]** Method/path, credential tier, request/response schemas, correlation, safety errors, unavailable operations, independent cluster failures, and IdP outage isolation. Cover health and OpenAPI authentication as well as command calls. |
| Preview and confirmation | V10, V16 | **[NEW]** Target/input changes invalidate previews; stale plans require renewed confirmation; dry-runs cause zero mutations; cluster switching rejects late results and invalidates plans/cursors; deep links reauthorize access. |
| Reads, uploads, and data integrity | V9, V12, V13, V14 | **[NEW]** Exact large offsets, encodings, repeated/binary headers, timestamps, bounds, continuation, missing offsets, invalid regex/JSONPath, malformed/oversized uploads, validate-all failures, 207 outcomes, secret isolation, safe destinations/redirects, and non-executable message content. |
| Replay and post-execution failures | V15, V17 | **[NEW]** Reauthorize and audit each batch; preserve record semantics, partition rules, cursor, and partial progress; stopping schedules no new work. Ambiguous transport failures and result-audit failures never trigger automatic replay, duplicate execution, or a rollback claim. |
| Persistence and retention | V18 | **[NEW]** Equivalent migrations, sessions, roles, retention, audit, and restart behavior on both real database providers; fakes do not establish durability or replace provider integration evidence. |
| Browser states and audit access | V20 | **[NEW]** Loading, empty, denied, unavailable, success, partial success, failed, and outcome-unknown states; permission-checked audit-history access. |

**[NEW]** Cross-check tests against every decision branch in the functional specification's section 3.4 Mermaid workflow: SSO/emergency authentication, allowed/denied authorization, destructive/non-destructive preparation, mutation/override classification, and audit-attempt success/failure. Exercise the accompanying operation lifecycle from `idle` through validation, preview, confirmation, execution, and each terminal state, including permission/session loss before execution. Each preview and execution call is independently enforced.

**[NEW]** Recording HTTP fakes verify outgoing request ordering, counts, destinations, credentials, headers, and payloads. Controlled responses simulate upstream errors, delayed responses, cancellation, and post-send uncertainty; mock OIDC issuers expose discovery, authorization, token, and signing-key behavior needed for both valid and invalid protocol flows. No external REST interaction is exempt from isolation and failure injection. Real-provider tests establish persistence guarantees that fakes cannot prove.

### 4.4 Execution Gates and Environment Isolation

| Trigger | Required suites |
|---|---|
| Pull requests | **[NEW]** Unit, backend API, component, contract, SQLite/PostgreSQL integration, coverage floors, and Chromium critical-path browser tests. |
| Nightly and before release | **[NEW]** Broader Chromium, Firefox, and WebKit browser coverage, plus isolated real Gateway/Kafka integration tests across at least two configured Gateway registrations in different environments. |
| Separately configured, opt-in | **[NEW]** Real identity-provider integration checks; normal suites continue to use mock OIDC issuers. |

- **[NEW]** Only explicitly designated integration tests contact real Gateways. Cover implemented operations and observable Kafka effects, both credential tiers, safety configurations, and compatible Kafka versions using explicitly allowlisted disposable test resources. Setup, destructive actions, and cleanup must never target production.
- **[NEW]** Normal suites reject unexpected external traffic; only local test hosts and explicitly configured disposable dependencies are allowed. Database integration remains separately identifiable even when run in the pull-request gate. Container-based suites require an available compatible container runtime; absence is not a passing result.
- **[NEW]** Missing prerequisites are reported as **skipped/not verified**, never passed. Missing required release evidence blocks release, including unavailable required Gateway coverage. Retain suite results, coverage reports, tested versions, and sanitized diagnostics so failures and unverified requirements remain visible.
- **[NEW]** Inspect rendered content, browser storage, network responses, diagnostics, and audit records with synthetic sentinel secrets. Browser traces, logs, and fixtures must not expose credentials or sensitive payloads; use synthetic test data and sanitize retained artifacts.

### 4.5 Performance Baselines

**[NEW]** Measure API latency, browser workflow timing, throughput, errors, CPU, and memory under documented concurrency, using controlled Gateway responses and both database modes. Separate application overhead from real Gateway/Kafka latency. Retain reproducible workload definitions, dataset sizes, environment/resource details, and results.

**[NEW]** Workload sizes, expected users/clusters, numeric latency/error limits, and resource budgets require later agreement before numeric performance release gates are enforced. No load-generator framework or numeric performance claim is selected by this baseline. Functional bounds, timeout, cancellation, and dependency-isolation checks remain required regardless of performance thresholds.

### 4.6 Verification Status and Handoff

**[NEW]** This section records the approved testing design, not executed application tests or measured coverage. Subsequent work must pin and validate test tools, define executable suites and CI configuration, provision isolated integration resources, and agree on performance workloads and limits. No application code, installed dependency, or test result is introduced here. Functional scope, application stack selections, and all compatibility/security release gates remain unchanged.

Future testing revisions preserve superseded definitions with `~~strikethrough~~` and prefix replacement choices with `**[NEW]**`.

## 5. System Topology & File Structure

### 5.1 Repository Boundary and Layout

**[NEW]** Keep backend, frontend, tests, and deployment assets in Kafka3O-UI with one solution and a feature-first folder layout. Kafka3O-Gateway remains a separate repository and deployment dependency; UI builds must not require a sibling Gateway checkout or copied Gateway implementation source. Retain the modular monolith and one application image, with no project per feature or separate Application/Infrastructure production projects.

**[NEW]** The following is the approved target tree, not an existing scaffold. Only `LICENSE` and the current specification files under `spec/` exist at this stage. Create implementation files as their approved tasks require them; the tree does not finalize method signatures, database schemas, or public API contracts.

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
| Server | **[NEW]** ASP.NET Core host, trusted authentication/authorization, application workflows, audit enforcement, and infrastructure implementations. References Contracts; its publish process includes Client static assets, producing one application image. This asset-build relationship does not move trusted policy into the browser. |
| Client | **[NEW]** Blazor WebAssembly shell, feature components/state, and same-origin UI backend clients under `Http/`. References Contracts, never Server, EF Core, Gateway transport, or backend secrets. `wwwroot/` contains public assets only. |
| Contracts | **[NEW]** Deliberately browser-facing request/response DTOs grouped by feature. References neither Server nor Client; contains no database entities, upstream credential models, or trusted authorization implementations. |
| Server feature folders | **[NEW]** Own endpoints, application services, policy logic, and narrow consumer-owned interfaces. `Identity/` owns OIDC/emergency authentication and sessions; `Access/` owns permissions, roles, and assignments; `Audit/` owns audit workflows and recording/query contracts. Kafka workflows live in `Clusters/`, `Topics/`, `Messages/`, `Groups/`, and `Security/`; Security here means Gateway SCRAM/quota operations, not application identity management. |
| Server infrastructure folders | **[NEW]** Implement feature-owned Gateway/storage interfaces. `Gateway/` owns typed HTTP transport and upstream wire models; `Persistence/` owns EF configuration, storage implementations, and provider-specific migration sets; `Configuration/` owns registry, secret-reference resolution, and configuration validation. |

**[NEW]** Server `Program.cs` is the composition root for dependency registration and hosting. Application workflows use direct calls to the focused services/interfaces defined in sections 2 and 3. Dependency checks enforce feature-policy versus infrastructure boundaries within the Server project; folders alone do not provide compile-time isolation. No generic repository, custom workflow engine, or interface-per-class rule is introduced.

**[NEW]** Client `Features/` mirrors user-facing feature names and owns pages/components and feature-scoped state. Contracts `Features/` follows the same naming where browser-facing DTOs are required, without forcing identical file counts or creating unused feature abstractions.

**[NEW]** Example target location: `src/Kafka3O.UI.Server/Features/Messages/ReplayService.cs` coordinates each replay batch's authorization, audit, and Gateway call; its narrow interface dependencies remain feature-owned, while HTTP details stay under `Infrastructure/Gateway/`. This is a proposed file and responsibility, not an implemented symbol or finalized method signature. Detailed contracts remain to be specified.

### 5.3 Test Alignment

**[NEW]** Each named test-suite directory contains its corresponding test project; `Kafka3O.UI.TestSupport` is shared test-only support, not a production dependency. Within suites, feature folders mirror implementation names so a workflow and its tests can be traced without searching unrelated layers.

| Location under `tests/` | Implementation alignment and approved tooling |
|---|---|
| `Kafka3O.UI.Server.Tests/` | **[NEW]** Server feature policy/workflow tests, `WebApplicationFactory` API tests, Gateway contract tests, and dependency-boundary checks using xUnit. Mirror `Features/` and relevant `Infrastructure/` paths; retain command/sub-operation traceability for all 47 enumerated operations. |
| `Kafka3O.UI.Client.Tests/` | **[NEW]** bUnit tests mirroring Client features, layouts, and feature-state behavior. |
| `Kafka3O.UI.Persistence.Tests/` | **[NEW]** Equivalent storage/session/role/audit/retention/restart tests against temporary SQLite files and Testcontainers PostgreSQL, including both provider migration sets. |
| `Kafka3O.UI.Browser.Tests/` | **[NEW]** Playwright for .NET against the running published application, organized by user workflow; normal suites use fake Gateways and mock OIDC issuers. |
| `Kafka3O.UI.ExternalIntegration.Tests/` | **[NEW]** Explicitly selected real Gateway/Kafka and separately configured opt-in real IdP suites, with allowlisted disposable resources and visible missing-prerequisite results. |
| `Kafka3O.UI.TestSupport/` | **[NEW]** Reusable recording HTTP fakes, mock OIDC issuers, and fixtures. Keep helpers local to their suite unless genuinely reused; production projects never reference this support project. |
| `Performance/` | **[NEW]** Workload definitions and reproducible baseline procedures. No load-generator framework or additional production project is selected. |

**[NEW]** The layout preserves section 4's execution gates: unit/API/component/contract/database and Chromium critical-path checks on pull requests; broader Chromium/Firefox/WebKit coverage and isolated real Gateway tests nightly and before release. Keep external suites separately selectable so a default test run cannot accidentally contact real Gateways or identity providers. Coverage floors, dependency isolation, and required release evidence remain unchanged.

### 5.4 Build, Configuration, and Deployment Locations

- **[NEW]** `Kafka3O.UI.slnx` groups the production and test projects. `global.json` pins the approved SDK; `Directory.Build.props` holds common build settings and `Directory.Packages.props` centralizes approved package versions. Central version declarations do not replace resolved lockfiles or compatibility/security evidence.
- **[NEW]** Server `appsettings.json` holds non-secret defaults; `config/` contains sanitized deployment/configuration examples with placeholders only. Registry and secret references remain configuration-managed, never browser-editable registry data. Database files, secrets, Data Protection keys, and generated test artifacts remain outside version control and outside public assets.
- ~~`deploy/Dockerfile` packages the backend and published Client assets as one Linux application image. `deploy/helm/kafka3o-ui/` contains the chart, values, and templates for Kubernetes. SQLite retains one replica with durable storage and no overlapping upgrade replicas; PostgreSQL scale-out retains the shared-session/revocation/key-storage requirements in section 1.3.~~ **[NEW]** `deploy/Dockerfile` packages the backend and published Client assets as one Linux application image. `deploy/helm/kafka3o-ui/` contains the chart, values, and templates for Kubernetes. Both database modes require exactly one application replica with non-overlapping upgrades in the first release; SQLite requires durable file storage and both modes must preserve state across restarts. Multi-replica support is deferred under section 1.3.
- **[NEW]** `scripts/` provides build, test, and security entry points as implementation requires. `spec/` retains the functional/technical specifications and later task plan. Do not introduce sibling-repository build dependencies or embed production secrets in scripts, fixtures, images, or chart values.

### 5.5 Validation and Handoff

**[NEW]** The topology maps the approved ASP.NET Core/Blazor stack, feature modules, narrow adapters, both persistence providers, and every section 4 test category to explicit locations. Implementation must verify project dependency direction, browser secret isolation, separate provider migration selection, isolated suite execution, and server publication of Client assets. A directory tree alone does not establish those guarantees.

**[NEW]** This step updates documentation only: no application scaffold, dependency installation, build, or test run is performed. Exact service signatures, schemas, migration design-time configuration, session/key persistence, audit durability, test-tool pins, deployment versions, and other outstanding design details remain unresolved where previously identified. Topology approval is not a Step 8 `STATUS: READY` audit, compatibility certification, or security clearance. Functional scope and existing verification/release gates are unchanged.

Future topology revisions preserve superseded definitions with `~~strikethrough~~` and prefix replacement choices with `**[NEW]**`.

## 6. Approved Audit Remediation Direction

**[NEW]** Decision date: 2026-09-24. These are approved remediation directions, not a completed audit sign-off. Design readiness remains blocked by unresolved security/persistence/API contracts, upstream contract discrepancies, and operational details. Release verification remains pending.

- **[NEW]** Step 8 evaluates complete, consistent, deterministic implementation requirements and defined verification gates. Actual builds, compatibility tests, resolved dependency audits, and artifact/container scans remain mandatory before release under section 1.6. Their absence during specification work is pending evidence, never a clean result. This separation does not permit unresolved design decisions or known incompatibilities to pass design review.
- **[NEW]** Zero tolerance for known vulnerabilities at every severity remains unchanged, including vulnerabilities without available fixes. Unscanned components must never be described as clean; design approval does not waive security or other release gates.
- **[NEW]** Prepare a concrete proposal for sessions, password hashing, CSRF, login throttling, audit failures, persistence transactions, UI API contracts, migration rules, and operational behavior, preferring built-in .NET facilities and the selected databases. These concrete choices require user approval before becoming normative specification text.
- **[NEW]** Inspect the current Gateway implementation, tests, and available OpenAPI read-only to resolve confirmation, continuation, and operation-count ambiguities. Do not modify Gateway files or invent behavior where implementation is missing or conflicts with its specification; report remaining upstream blockers explicitly.
- **[NEW]** The first release supports SQLite and PostgreSQL with one application replica in either mode and non-overlapping upgrades, as reflected in sections 1.3, 2.1, and 5.4. Multi-replica deployment is a later, separately approved capability. Restart persistence and secure key management remain required now.

## 7. Approved Security, Persistence, and Compatibility Design

**[NEW]** Approved on 2026-09-24. This section makes the approved remediation choices normative and refines earlier handoff notes for these subjects. It does not finalize the unresolved contracts listed in section 7.7 or grant readiness/release sign-off.

### 7.1 Sessions, Cookies, and CSRF

- **[NEW]** Store opaque sessions in the selected database. Validate expiry, revocation, and current application roles on every request without a permissive authorization cache. Preserve provider claims as the verified login snapshot and apply local role/mapping changes on the next request.
- **[NEW]** Explicit user actions renew idle activity; background polling does not. Keep the 4-hour idle and 8-hour absolute limits. Define the exact qualifying-activity classification and concurrent timestamp-update rules in the remaining session contract; do not treat every HTTP request as activity.
- **[NEW]** Use ASP.NET Core cookie authentication and antiforgery validation. Application cookies are Secure and HttpOnly; configure OIDC correlation/nonce cookies for the callback flow. Require an antiforgery header on state-changing browser requests, including emergency login and logout. Define the pre-login antiforgery bootstrap and cookie/SameSite settings before implementation. OIDC callbacks retain their separate state/nonce/correlation validation; do not require a browser API antiforgery header from the identity provider.
- **[NEW]** Never put authentication tokens in browser storage. A session/database failure must not fall back to anonymous execution or stale permissive authorization.

### 7.2 Emergency Credentials and Login Throttling

- **[NEW]** Use ASP.NET Core Identity's password hasher without introducing additional local accounts or requiring a full Identity account-management subsystem. Select Identity V3 PBKDF2-HMAC-SHA512 with at least 210,000 iterations, subject to deployment benchmarking. Provision the hash through a secret; a credential-version change revokes existing local sessions. Benchmarking does not authorize reducing the approved minimum.
- **[NEW]** Persist failed-attempt state across restarts. Apply a threshold of five failures per account/source-address pair in 15 minutes, followed by progressive delays capped at 60 seconds, plus a bounded global concurrency limit. Trust forwarded client addresses only from configured proxies; never permanently lock the account.
- **[NEW]** The delay progression, counter reset/expiry behavior, global concurrency value, and overload response remain explicit design items for approval. This baseline does not claim that per-address limits alone prevent distributed guessing.

### 7.3 Key Persistence and Rotation

**[NEW]** Persist Data Protection keys outside the container filesystem on protected durable storage, encrypted using a secret-provisioned certificate. Retain required old keys during rotation. Missing or unreadable key material prevents startup rather than silently creating an incompatible key ring. Define controlled first-install initialization, certificate/key rotation overlap, permissions, and restore procedures before implementation; first-install provisioning must be distinguishable from loss of an existing key ring.

### 7.4 Persistence and Audit Failure Semantics

**[NEW]** Use tables for sessions, roles, role-permission membership, assignments, login throttling, and audit events, with provider-independent concurrency tokens and uniqueness constraints. Concurrent role edits return a conflict instead of silently overwriting changes. Exact columns, indexes, relationships, retention queries, and concurrency response schemas remain to be defined for both providers.

| Event or operation | Required persistence and failure behavior |
|---|---|
| External mutation | **[NEW]** Commit audit `ATTEMPT` before forwarding. Failure prevents the Gateway call. Preserve the known operation result independently from any subsequent audit-persistence failure; never claim rollback or retry the mutation. |
| Role/assignment change | **[NEW]** Commit the audit attempt first; then commit the local change and its successful `RESULT` atomically in one database transaction. Failure before commit must not leave a successful role change without its result record. |
| Emergency read, destructive preview, lock override | **[NEW]** Require durable audit recording before executing/forwarding the action. Failure rejects it. These rules apply to each Gateway call, including overridden previews; the simplified functional Mermaid diagram does not bypass this gate. |
| Successful authentication | **[NEW]** Require durable authentication auditing before issuing a session. Audit failure prevents successful login and session issuance. |
| Failed authentication or authorization denial | **[NEW]** The request remains denied if logging fails; emit sanitized operational diagnostics without exposing credentials. Logging failure never turns a rejection into access. |
| Post-execution result recording | **[NEW]** Attempt result persistence with a bounded deadline independent of request cancellation. Do not retry the business mutation. Keep any prior durable attempt and expose unresolved audit state if result persistence fails. |
| Crash with unmatched attempt | **[NEW]** Retain and visibly classify the attempt as unresolved. Do not infer success, failure, or zero writes, and do not replay it automatically. |

**[NEW]** Run provider-specific migrations explicitly while the application is stopped. Refuse startup against an incompatible schema; do not migrate automatically on ordinary startup. Define provider migration selection, transaction/recovery rules, and backup/restore procedures as part of the remaining persistence contract.

**[NEW]** Tests must inject each failure in the matrix, verify zero prohibited Gateway calls/session issuance/local changes, and exercise result-write failure, cancellation, and crash recovery without duplicate mutation. Persistence and restart assertions run against both actual database providers, not only storage fakes.

### 7.5 UI API and Operational Direction

- **[NEW]** Use explicit authenticated UI endpoints for sessions, roles, assignments, audit history, and cluster operations, with narrowly scoped unauthenticated authentication/bootstrap endpoints where needed. Never expose a generic caller-controlled proxy. Before task creation, define each operation's permission, credential tier, mutation classification, audit requirement, DTO, and error mapping in a contract table.
- **[NEW]** Across the browser/backend boundary, serialize offsets and other precision-sensitive 64-bit integers as decimal strings. Parse and range-check strictly, converting to Gateway wire types only on the backend. Preserve null/encoding/header semantics; do not route these values through floating-point conversion.
- **[NEW]** Configuration and secret changes are restart-only initially. Deploy with non-overlapping replacement and explicit downtime for either database. Persist sessions, authorization data, audit records, and key material across restarts; credential-version changes revoke local sessions as specified in section 7.2.
- **[NEW]** Use a 5-second connection timeout and operation-specific overall deadlines that allow the configured scan/sample duration. Exact overall deadlines, polling intervals, request-size limits, and the bounded result-audit deadline remain to be specified. Do not introduce automatic retries of ambiguous mutations.
- **[NEW]** Stop admitting work before shutdown. Allow bounded draining under a defined termination budget; unfinished mutations remain outcome-unknown, never automatically replayed. Define readiness/drain sequencing and the termination budget before implementation.

### 7.6 Gateway Compatibility Baseline

**[NEW]** Adopt 41 command IDs across 47 command operations and health paths `/v1/health/live` and `/v1/health/ready`. The two documentation routes `/openapi.json` and `/docs` are additional, not command operations. These narrow compatibility decisions supersede contradictory count/health-path prose in the referenced upstream specification for the UI integration only; no Gateway files are changed.

**[NEW]** Evidence is read-only source and checked-in snapshot inspection on 2026-09-24: Gateway `internal/api/testdata/openapi.golden.json` contains 47 operations and the prefixed health routes; `internal/api/openapi_test.go` asserts 41 IDs, 47 operations, and an empty pending-command list; `internal/api/api.go` registers the health paths. This is not a freshly served deployment contract or executed test result. Record the targeted Gateway revision/artifact and revalidate its served OpenAPI before release.

**[NEW]** Observed dry-run behavior: `internal/service/core/destructive.go` builds a plan and returns a dry-run before confirmation comparison; `internal/api/topic_delete_test.go` exercises token discovery without prior confirmation. However, the replay OpenAPI request schema still requires `confirm`. The service observation does not prove all HTTP routes accept missing confirmation. First-preview wire shapes and route-specific schema handling remain blocked pending an approved compatibility rule; do not silently relax execution confirmation.

**[NEW]** Observed continuation shape: `internal/api/message/dto.go` defines one replay `source.from` and optional partition selection, but returns a per-partition cursor map. Read/search requests similarly lack a general per-partition input cursor. `internal/api/message_replay_test.go` covers single-partition resume. Multi-partition continuation, stable end bounds, and aggregation semantics remain blocked; do not invent a cursor-map request field, silently restart a range, or assume per-partition fan-out is equivalent without a reviewed contract and tests.

### 7.7 Remaining Design Blockers and Verification Status

**[NEW]** Design status: `STATUS: BLOCKED`. Release verification: `PENDING`. This records approval of the design direction, not a complete Step 8 sign-off or permission to start task creation.

**[NEW]** Remaining decisions include concrete API routes/DTOs/error and permission catalogs; persistence schemas and migration/recovery mechanics; session activity and cookie/antiforgery contracts; throttle progression/concurrency; key provisioning/rotation; operational deadlines/polling/shutdown limits; Gateway dry-run HTTP compatibility and multi-partition continuation. The approved choices above reduce the audit gaps but do not resolve these details by implication.

**[NEW]** No application tests, benchmarks, dependency compatibility checks, or artifact scans were run for this documentation change. Test-tool pins, deployment-version selections, and release evidence remain pending under sections 1 and 4. The all-severity zero-CVE policy remains unchanged; no unscanned component is certified clean.