# Technical Specification

**Product:** Kafka3O-UI
**Version:** ~~0.2~~ ~~0.3~~ ~~0.4~~ ~~0.5~~ ~~0.6~~ ~~0.7~~ ~~0.8~~ ~~0.9~~ ~~0.10~~ ~~0.11~~ ~~0.12~~ ~~0.13~~ ~~0.14~~ ~~0.15~~ **[NEW]** 0.16
**Date:** ~~2026-09-22~~ ~~2026-09-24~~ ~~2026-09-25~~ **[NEW]** 2026-09-26
**Status:** ~~Technology and minimalist design-pattern baselines approved by the user; compatibility and release security verification pending~~ ~~Technology, minimalist design-pattern, and SOLID baselines approved by the user; compatibility and release security verification pending.~~ ~~Technology, design-pattern, SOLID, and testing-strategy baselines approved by the user; test-tool version pins, compatibility, and release security verification pending.~~ **[NEW]** Technology, design-pattern, SOLID, testing-strategy, and topology baselines approved by the user; test-tool version pins, compatibility, and release security verification pending.
**Pipeline:** ~~Steps 3 and 4 completed. Detailed contracts, further architecture refinement, test design, and implementation remain subsequent steps.~~ ~~Steps 3 through 5 completed. Detailed contracts, further architecture refinement, test design, and implementation remain subsequent steps.~~ ~~Steps 3 through 6 completed. Detailed contracts, topology, executable test definitions, and implementation remain subsequent steps.~~ **[NEW]** Steps 3 through 7 completed. Spec audit, resolution of outstanding design details, executable task/test definitions, and implementation remain pending.
**Functional baseline:** [FUNC-SPEC.md](FUNC-SPEC.md), revision ~~0.2~~ ~~0.3~~ ~~0.4~~ ~~0.5~~ **[NEW]** 0.6.
**Contract addendum:** **[NEW]** [CONSOLIDATED-PROPOSAL.md](CONSOLIDATED-PROPOSAL.md), revision ~~0.2~~ ~~0.3~~ ~~0.4~~ ~~0.5~~ **[NEW]** 0.6, approved under sections 12-13. Section 13's reduced-v1 scope supersedes the earlier v1-wide B1/B2/workflow requirements; those features remain deferred, not proven compatible.

**[NEW] Current release precedence:** Section 13 controls earlier all-operation, replay, continuation, permission-count and B1/B2 handoff statements throughout this technical specification. V1 has 40 active command IDs / 46 operations / 49 permission literals. The Gateway source catalog is unchanged at 41 / 47. Design status remains BLOCKED pending full reduced-v1 review and separate approved READY sign-off; release verification remains PENDING.

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
| 0.8 | 2026-09-25 | **[NEW]** Recorded the first approved detailed contract batch: unchanged Gateway constraint, compatibility investigation, fixed permission IDs, application routes, storage fields, session activity/cookies, errors, deadlines, polling, uploads, and maintenance recovery. Remaining design blockers and release gates retained. |
| 0.9 | 2026-09-25 | **[NEW]** Recorded six approved refinements: explicit mirrored cluster routes, separate audit-result failure metadata, session identifier hashing and antiforgery header, emergency throttling schedule/concurrency, controlled key initialization/rotation, and post-restore session/access reconciliation. No readiness sign-off or Gateway modifications. |
| 0.10 | 2026-09-25 | **[NEW]** Recorded six approved contracts for response metadata, revision preconditions, application-list pagination, throttle admission/window behavior, atomic session-expiry boundaries, and provider-specific OIDC callbacks. Gateway unchanged; remaining design and release gates retained. |
| 0.11 | 2026-09-25 | **[NEW]** Recorded conditional T2 discovery authorization, export headers/finalization and byte limit, error outcomes, exact revision-header rejection rules, cross-provider persistence conventions, and scheduled audit retention. Snapshot continuation remains unproven; Gateway unchanged. |
| 0.16 | 2026-09-26 | **[NEW]** Recorded approved reduced-v1 scope and addendum 0.6: 40 active command IDs / 46 operations / 49 permissions, one-shot explicit-offset single-partition M1/M3/M4, deferred M8 and message workflows, revised acceptance and B1/B2 classification. Repaired the damaged section 7.7 heading. Approvals for intervening revisions remain recorded in section 12; no READY or release sign-off. |

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

**[NEW]** Observed continuation shape: `internal/api/message/dto.go` defines one replay `source.from` and optional partition selection, but returns a per-partition cursor map. Read/search requests similarly lack a general per-partition input cursor. `internal/api/message_replay_test.go` covers single-partition resume. Multi-partition continuation, stable end bounds, and aggregation semantics remain blocked; do not invent a cursor-map request field.

### 7.7 Remaining Design Blockers and Verification Status

**[NEW]** Design status: `STATUS: BLOCKED`. Release verification: `PENDING`. This records approval of the design direction, not a complete Step 8 sign-off or permission to start task creation.

~~Remaining decisions include concrete API routes/DTOs/error and permission catalogs; persistence schemas and migration/recovery mechanics; session activity and cookie/antiforgery contracts; throttle progression/concurrency; key provisioning/rotation; operational deadlines/polling/shutdown limits; Gateway dry-run HTTP compatibility and multi-partition continuation. The approved choices above reduce the audit gaps but do not resolve these details by implication.~~ **[NEW]** Section 8 records the next approved contract batch and supersedes earlier pending-decision statements only for its explicitly selected values. Section 8.7 lists the remaining gaps. Design remains blocked; this is not a Step 8 readiness sign-off.

**[NEW]** No application tests, benchmarks, dependency compatibility checks, or artifact scans were run for this documentation change. Test-tool pins, deployment-version selections, and release evidence remain pending under sections 1 and 4. The all-severity zero-CVE policy remains unchanged; no unscanned component is certified clean.

## 8. Approved Detailed Contract Batch 1

**[NEW]** Approved on 2026-09-25. The user rejected Gateway modifications, retained operation-level permissions, selected explicit-user-request session activity and stopped-application migrations with backup, then approved this first detailed proposal. This section refines section 7; it does not approve application implementation, task creation, the entire visual-design draft, or a readiness verdict. Unspecified contracts remain open rather than being inferred from examples.

### 8.1 Unchanged Gateway and Compatibility Investigation

- **[NEW]** Kafka3O-Gateway remains unchanged. Preserve all 41 command IDs / 47 operations and the approved multi-partition requirements; refusal to change Gateway is not approval to drop features.
- **[NEW]** For first previews, investigate supplying `confirm: ""` with `dryRun=true` where the existing HTTP schema requires a confirmation string. Checked-in `ReplayRequestBody.confirm` has type string without a non-empty constraint, and the shared destructive service returns a dry-run before checking confirmation. These source observations support a candidate adapter request shape, not proof that every HTTP route accepts it. Require route-specific HTTP tests proving successful preview and zero mutations before treating compatibility as established. Execution still requires the real exact target or plan token; never reuse the empty preview value for execution.
- **[NEW]** Investigate UI-backend orchestration of existing single-partition calls using exact cursors and fixed end bounds. Approval covers investigation only. Before approval of an implementation contract, demonstrate ordering, aggregate limits, stable source/filter/window semantics, partial progress, replay auditing/authorization per request, and equivalence to required multi-partition behavior. Do not invent Gateway cursor fields, silently restart ranges, or automatically retry ambiguous mutations.
- **[NEW]** No Gateway code, schema, or tests are changed by this decision. Target deployment compatibility remains unverified, and multi-partition orchestration remains a design blocker.

### 8.2 Fixed Permission Identifiers

**[NEW]** The catalog contains 47 literal Gateway operation permissions plus three separate permissions below. No wildcard grants or command-level parent grants are introduced for multi-operation commands. Roles remain user-created named bundles; environment/cluster assignment union and application-wide administration semantics remain as specified in FUNC-SPEC section 2.3.

| Family | Literal permission IDs |
|---|---|
| Cluster | **[NEW]** `gateway.c1`, `gateway.c2`, `gateway.c3.live`, `gateway.c3.ready`, `gateway.c4`, `gateway.c5`, `gateway.c6`, `gateway.c7`, `gateway.c8`, `gateway.c9.start`, `gateway.c9.cancel`, `gateway.c9.elect`, `gateway.c10`, `gateway.c11`, `gateway.c12` |
| Topics | **[NEW]** `gateway.t1`, `gateway.t2`, `gateway.t3`, `gateway.t4`, `gateway.t5`, `gateway.t6`, `gateway.t7`, `gateway.t8`, `gateway.t9`, `gateway.t10`, `gateway.t11`, `gateway.t12` |
| Messages | **[NEW]** `gateway.m1`, `gateway.m2`, `gateway.m3`, `gateway.m4`, `gateway.m5`, `gateway.m6`, `gateway.m7`, `gateway.m8` |
| Groups | **[NEW]** `gateway.g1`, `gateway.g2`, `gateway.g3`, `gateway.g4`, `gateway.g5`, `gateway.g6`, `gateway.g7` |
| Kafka security | **[NEW]** `gateway.s1.list`, `gateway.s1.create`, `gateway.s1.delete`, `gateway.s2.list`, `gateway.s2.alter` |
| Additional | **[NEW]** `app.access.manage`, `app.audit.view`, `gateway.lock.override` |

**[NEW]** `app.access.manage` controls application role/assignment administration and can grant additional access; it does not itself grant Kafka operations. `app.audit.view` controls application audit viewing. `gateway.lock.override` supplements the selected operation permission and requires a request-scoped reason; it is not a standalone Kafka-operation grant or bypass of other safety controls. Credential selection stays server-side; S1/S2 lists still require configured operator-tier Gateway credentials without implying user mutation permission.

### 8.3 Application Endpoint Baseline

**[NEW]** All paths below use prefix `/api/v1`. These are UI-backend endpoints, not changes to Gateway. Non-public routes require a valid session; state-changing browser requests require antiforgery protection, including sign-in initiation, emergency login, activity, and logout. OIDC callbacks retain their protocol-specific validation rather than API antiforgery-header requirements. The table selects methods, paths, and the stated fields; it is not yet a complete DTO/OpenAPI schema.

| Method | Path | Approved contract / access |
|---|---|---|
| GET | `/auth/bootstrap` | **[NEW]** Public bootstrap: configured provider IDs/display names and antiforgery request token; no credentials or configuration secrets. |
| POST | `/auth/login/{providerId}` | **[NEW]** Public authentication entry: begin allowlisted OIDC flow with validated local `returnPath`. |
| POST | `/auth/emergency` | **[NEW]** Public authentication entry: `{password}` for the single configured identity; throttle and audit before session issuance. |
| GET | `/session` | **[NEW]** Current principal, login/idle/absolute expiry, and application permissions. |
| POST | `/session/activity` | **[NEW]** Explicit activity notification; empty body; session and antiforgery required. |
| POST | `/session/logout` | **[NEW]** Revoke current session and clear session cookie. |
| GET | `/permissions` | **[NEW]** Fixed catalog; requires `app.access.manage`. |
| GET | `/roles` | **[NEW]** List roles; requires `app.access.manage`. |
| POST | `/roles` | **[NEW]** Create role from `{name, permissionIds}`; requires `app.access.manage`. |
| PUT | `/roles/{id}` | **[NEW]** Replace editable role fields; requires `app.access.manage` and `If-Match` revision. |
| GET | `/assignments` | **[NEW]** List assignments; requires `app.access.manage`. |
| POST | `/assignments` | **[NEW]** Create provider-qualified role assignment; requires `app.access.manage`. |
| PUT | `/assignments/{id}` | **[NEW]** Update assignment; requires `app.access.manage` and `If-Match` revision. |
| GET | `/clusters` | **[NEW]** Authorized registrations and permitted observations, never registry credentials. |
| GET | `/audit` | **[NEW]** Paginated/filterable audit history; requires `app.audit.view`. |
| GET | `/audit/{id}` | **[NEW]** Audit event detail; requires `app.audit.view`. |

**[NEW]** Register the 47 Gateway operations as explicit cluster-scoped UI endpoints, never as a catch-all proxy. Their full method/path/DTO/permission/tier/audit mapping remains a separate approval item. Resource identifiers must not grant an arbitrary upstream destination. Callback paths, complete request/response schemas, paging/filter parameters, antiforgery-header naming, and revision header serialization remain to be finalized; no route-table omission authorizes a new capability.

### 8.4 Persistence Field Baseline

**[NEW]** Use UUID entity IDs, UTC instants, UUID concurrency revisions, and canonical JSON only for structured snapshots. The following approved field baseline must be refined into provider-specific schemas, not treated as completed migrations. Never persist password material or message bodies in these tables; the emergency password hash remains secret-provisioned under section 7.2.

| Table | Approved fields and selected constraints |
|---|---|
| Sessions | **[NEW]** `tokenHash`, `authSource`, `issuer`, `subject`, `claimsJson`, `createdAt`, `lastActivityAt`, `absoluteExpiresAt`, `revokedAt`, `credentialVersion`. |
| Roles | **[NEW]** `id`, `name`, `normalizedName`, `revision`; unique normalized name. |
| RolePermissions | **[NEW]** `roleId`, `permissionId`; composite primary key and role foreign key. |
| Assignments | **[NEW]** `id`, `providerId`, `matchKind`, `claimType`, `matchValue`, `roleId`, `scopeKind`, `scopeId`, `revision`; reject duplicate mappings. |
| LoginThrottle | **[NEW]** `accountId`, `sourceAddress`, `windowStartedAt`, `failureCount`, `nextAllowedAt`, `revision`; composite account/address key. |
| AuditEvents | **[NEW]** `id`, `attemptId`, `occurredAt`, `correlationId`, principal identity, environment/cluster IDs, operation, sanitized target, phase/outcome, dry-run flag, override reason, error code. |

**[NEW]** Final types, lengths, nullability, indexes, normalization/uniqueness rules, foreign-key behavior, session-token hashing details, canonical snapshot representation, and provider mappings remain subject to approval. Audit identity/target concepts in the table are not yet finalized individual column definitions. Preserve section 7.4's durable attempt, local transaction, independent result-write, cancellation, and unmatched-attempt rules throughout schema design.

### 8.5 Session Activity, Cookies, and Error Envelope

- **[NEW]** Session cookie name: `__Host-Kafka3O.Session`; Secure, HttpOnly, Path `/`, SameSite=Lax, no Domain. OIDC correlation/nonce cookies use framework-compatible Secure/SameSite=None settings. Continue to keep authentication tokens out of browser storage.
- **[NEW]** Explicit authenticated navigation and submitted user actions invoke `POST /api/v1/session/activity`. Passive viewing, background polling, and automatic replay batches never invoke it. Use server time and an atomic monotonic `lastActivityAt` update only while the session remains valid. An activity request cannot revive an expired or revoked session. The 4-hour idle and 8-hour absolute limits remain unchanged.
- **[NEW]** Error envelope fields: `{code, message, status, requestId, fieldErrors?, upstreamCode?, outcome}`. Sanitize every returned field. Exact code and outcome enums and field-error element schemas remain to be finalized.

| Condition | Approved HTTP status / semantics |
|---|---|
| Input validation | **[NEW]** 400 |
| Expired session | **[NEW]** 401; do not mistake Gateway credential failure for user-session expiry. |
| Permission denied | **[NEW]** 403 |
| Missing resource | **[NEW]** 404 |
| Stale revision | **[NEW]** 412 |
| Missing required revision precondition | **[NEW]** 428 |
| Throttled | **[NEW]** 429 |
| Audit/database unavailable | **[NEW]** 503; required pre-execution persistence failure blocks the action. |
| Upstream timeout | **[NEW]** 504; mutation `outcome: "unknown"` unless non-execution is established. |

**[NEW]** Preserve upstream safety error codes and per-item 207 outcomes. Post-execution audit-result failure must retain the known business result and distinguish audit persistence failure; a generic 503 must not erase a known result, imply rollback, or prompt automatic replay. The concrete response representation for this combined condition remains to be finalized. Never automatically retry ambiguous mutations.

### 8.6 Operational Limits and Maintenance Recovery

| Setting | Approved value / behavior |
|---|---|
| Gateway connection timeout | **[NEW]** 5 seconds |
| Ordinary read deadline | **[NEW]** 30 seconds |
| Mutation / replay-batch deadline | **[NEW]** 60 seconds |
| Throughput sample deadline | **[NEW]** Requested sample duration + 10 seconds, maximum 70 seconds |
| Audit write deadline | **[NEW]** 5 seconds each; result recording remains independent of request cancellation under section 7.4. |
| Application operation deadline | **[NEW]** 85 seconds |
| Ingress deadline | **[NEW]** 100 seconds |
| Visible health polling | **[NEW]** Every 30 seconds; paused in hidden tabs; does not renew session activity. |
| Message polling | **[NEW]** No automatic message polling. |
| Upload limit | **[NEW]** 10,000,000 bytes, further constrained by Gateway. |
| Shutdown | **[NEW]** Stop admission, drain for 90 seconds, Kubernetes termination grace 110 seconds. Interrupted mutations remain unknown; no automatic replay. |

**[NEW]** Keep operation budgets compatible with requested scan/sample durations and the per-operation Gateway bounds. These are approved design values, not benchmarked performance claims. Detailed deadline propagation, admission/readiness sequencing, request-body limits for non-upload endpoints, and configured-bound validation still require concrete contracts.

**[NEW]** Database upgrades use an explicit maintenance command while the application is stopped, with a backup first. Back up the database and required Data Protection key material, execute the selected provider's migrations, then validate schema compatibility before startup. Never migrate on normal startup. On migration failure, stay stopped and restore the matching backup rather than automatically down-migrating. Restoration never replays unmatched audit attempts or claims to reverse Kafka writes. Exact command syntax, backup/restore tooling, key/certificate handling, and post-restore session/security reconciliation remain approval items.

### 8.7 Remaining Decisions and Verification Gate

**[NEW]** Design status remains `STATUS: BLOCKED`; release verification remains `PENDING`. This approval records one contract batch, not the Step 8 audit sign-off required before Step 9.

**[NEW]** The following list records the gaps at batch 1. Section 9 supersedes pending decisions only where it explicitly selects their values; section 9.7 is the current remaining-decision list.

- **[NEW]** Finalize all 47 cluster endpoint mappings and request/response DTOs; full application endpoint schemas, OIDC callback/antiforgery details, error/outcome enumerations, concurrency header behavior, and audit-failure response representation.
- **[NEW]** Finalize provider schemas/constraints/indexes, session hashing/expiry concurrency mechanics, throttle progression/concurrency, retention queries, migration tooling, first-install key provisioning, key/certificate rotation and restore security rules.
- **[NEW]** Verify route-specific empty-confirm previews and resolve multi-partition orchestration semantics without Gateway changes or scope reduction. Source inspection alone does not close these gaps.
- **[NEW]** Complete deadline propagation and lifecycle details, scan-bound validation, and remaining payload/resource limits. Existing test-tool/deployment selection and all-severity zero-CVE release gates remain mandatory.

**[NEW]** This batch changes documentation only. No application scaffold, Gateway modifications, runtime/HTTP tests, migrations, benchmarks, or vulnerability scans were performed. Subsequent changes need approval at the relevant design gate; do not clean pending diff markers before their task actions exist.

## 9. Approved Detailed Contract Batch 2

**[NEW]** Approved on 2026-09-25. The user accepted all six proposed refinements below. These decisions refine sections 7 and 8 without modifying Gateway, reducing functional scope, approving the entire visual design, or issuing a Step 8 sign-off. Earlier statements that these particular choices are pending are superseded by this section; unselected details remain open.

### 9.1 Explicit Cluster Route Mapping

**[NEW]** Map every existing command operation at `/v1/...` to a UI endpoint at `/api/v1/clusters/{clusterId}/...`, preserving its HTTP method and the suffix after `/v1/`. Register all 47 command operations explicitly, with their individual permission IDs from section 8.2. This rule defines their path mapping, not a runtime catch-all or arbitrary forwarding endpoint.

| Gateway command endpoint | Corresponding UI endpoint |
|---|---|
| GET `/v1/health/live` | **[NEW]** GET `/api/v1/clusters/{clusterId}/health/live`, permission `gateway.c3.live` |
| GET `/v1/health/ready` | **[NEW]** GET `/api/v1/clusters/{clusterId}/health/ready`, permission `gateway.c3.ready` |
| POST `/v1/replays` | **[NEW]** POST `/api/v1/clusters/{clusterId}/replays`, permission `gateway.m8` |

**[NEW]** Resolve `clusterId` only against authorized configured registrations; never accept caller-controlled Gateway URLs or credentials. Preserve resource parameter encoding, current authorization, server-selected credential tier, audit, preview, and confirmation rules. Route mirroring does not imply raw DTO passthrough: exact numeric strings, sanitization, and UI response metadata remain UI contracts. Gateway documentation routes are not additional command operations.

**[NEW]** Validation must enumerate the targeted Gateway command catalog and assert 47 distinct method/path mappings, 41 command IDs, no collisions, correct individual permissions, and rejection of unregistered destinations. Complete per-operation DTO/tier/audit bindings and target-deployment verification remain required; these examples are not a claim that endpoints exist in code.

### 9.2 Business Result and Audit Recording Failure

**[NEW]** When execution has a known business result but subsequent audit-result recording fails, preserve that result and return separate `auditStatus: "recording_failed"` metadata plus the correlation ID. The UI shows a persistent audit warning alongside the actual result. Do not relabel known success as operation failure, imply rollback, or automatically retry the operation. Preserve known partial/item outcomes as well; do not replace a 207 result with a generic failure.

**[NEW]** Failure to persist required pre-execution audit data still blocks execution under sections 7.4 and 8.5. If the business outcome itself is unknown, audit metadata must not convert it to success. Crash-recovered unmatched attempts remain unresolved and are never replayed automatically. Detailed metadata placement, complete status enumeration, and download/non-JSON response handling remain to be specified; this decision selects semantics and the failure field/value, not a complete new response envelope.

**[NEW]** Validation must inject result-write failure after a known successful or partially successful mutation, verify preserved result/correlation and the persistent warning, and assert exactly one business execution. Separate attempt-write failure tests require zero executions.

### 9.3 Session Identifier and Antiforgery Handling

- **[NEW]** Generate session identifiers from 32 cryptographically random bytes. Store only their SHA-256 hashes in the session database, never the raw bearer identifiers. Retain the protected cookie settings and database-backed validation rules in sections 7.1 and 8.5. This hashing choice applies to high-entropy session identifiers, not human passwords; emergency passwords retain the approved Identity password hasher.
- **[NEW]** Use ASP.NET Core antiforgery with request header `X-CSRF-TOKEN`. Keep the request token in browser memory, not local/session storage or other persistent client storage. Refresh antiforgery state after login and logout so it is bound to the current authentication context. OIDC callbacks continue to use their distinct state/nonce/correlation validation.
- **[NEW]** Check expiry and revocation before any activity update; expired sessions cannot be renewed. Explicit activity remains governed by section 8.5, including its monotonic server-time update and exclusion of automatic polling/replay batches.
- **[NEW]** Validate random identifier generation/hash lookup without raw identifiers in database or diagnostics, missing/invalid antiforgery headers, authentication transitions, and expiry racing with activity. Cookie/token serialization, hash storage format, and the precise database concurrency mechanism remain to be finalized.

### 9.4 Emergency Login Throttle Schedule

**[NEW]** Retain persisted failed-verification state per emergency-account/source-address pair and the five-failure threshold within 15 minutes. Following the fifth failed verification, set the first delay before another verification is allowed; each subsequent failed verification advances the capped schedule below.

| Failed verification count in the active sequence | Delay before another verification |
|---|---|
| 5 | **[NEW]** 1 second |
| 6 | **[NEW]** 2 seconds |
| 7 | **[NEW]** 4 seconds |
| 8 | **[NEW]** 8 seconds |
| 9 | **[NEW]** 16 seconds |
| 10 | **[NEW]** 32 seconds |
| 11 and later | **[NEW]** 60 seconds |

**[NEW]** Reject requests arriving before the next allowed time with HTTP 429 and `Retry-After`, without running another password verification. An early rejected request is not a failed password verification. Reset the pair's sequence after successful login or 15 minutes without a failed verification. Never permanently lock the emergency account; retain trusted-proxy-only handling of forwarded source addresses.

**[NEW]** Permit at most two concurrent password verifications application-wide, with no waiting queue. This limits expensive hashing work; it is not proof of protection from distributed guessing. Atomic counter/admission mechanics, exact rolling-window representation, reset boundary behavior, and the global-cap overload response contract remain to be finalized rather than inferred from the delay table.

**[NEW]** Controlled-clock tests must cover the fifth-failure boundary, each delay, the 60-second cap, early rejection without hashing, reset after success/inactivity, restart persistence, and no more than two concurrent verifications with no queue. Run persistence-related cases against both approved database providers.

### 9.5 Controlled Key Initialization and Rotation

**[NEW]** Initialize the protected Data Protection key store through an explicit first-install maintenance command. Normal application startup fails if required keys are missing or unreadable; it must not silently recreate lost material. Keep the durable protected storage and secret-provisioned certificate requirements from section 7.3.

**[NEW]** During certificate rotation, encrypt new keys with the new certificate. Retain old decryption certificates until no retained live or backup key material requires them. Removing a certificate merely because it is no longer used to encrypt new keys is not a valid retirement rule. Exact command syntax, first-install detection, permissions, backup inventories, and retirement verification procedures remain to be finalized.

**[NEW]** Verification must distinguish deliberate first installation from a lost key store, reject normal startup with missing/unreadable keys, and exercise decryption of retained keys across rotation and restoration. No key-provisioning or rotation command has been implemented or executed for this documentation update.

### 9.6 Post-Restore Access Reconciliation

**[NEW]** Keep the application stopped during restoration. Restore matching database and key material, invalidate all restored sessions, and reconcile roles, assignments, and emergency credential versions before reopening access. This prevents restored session records from automatically granting access after recovery; it does not imply that restoring stale roles is safe without review.

**[NEW]** Preserve unmatched audit attempts as unresolved. Never automatically replay them or claim that restoring the UI database rolls back Kafka changes. Retain section 8.6's backup-first maintenance process and stay-stopped behavior on migration/recovery failure. Exact recovery commands, the authoritative source/checklist for access reconciliation, and validation of completion remain design items.

**[NEW]** Recovery tests must prove pre-restore cookies cannot authenticate after session invalidation, reopening is gated on the reconciliation procedure, and unmatched attempts remain visible without business re-execution. No production backup or restore is authorized by this specification edit.

### 9.7 Remaining Decisions and Verification Gate

**[NEW]** Design status remains `STATUS: BLOCKED`; release verification remains `PENDING`. Acceptance of these six decisions is not the Step 8 readiness sign-off required for Step 9 task creation.

**[NEW]** This list records the remaining decisions at batch 2. Section 10 resolves the explicitly selected contracts below; section 10.7 is the current remaining-decision list.

- **[NEW]** Complete the 47-operation request/response DTO, permission/tier/audit binding table under the approved route-mapping rule; application endpoint schemas, OIDC callback paths, revision headers, exact error/outcome codes, and audit metadata placement for JSON and non-JSON results.
- **[NEW]** Finalize provider schemas, lengths/nullability/indexes/constraints, session representation and expiry concurrency, throttle window/admission/reset mechanics and overload responses, and retention queries.
- **[NEW]** Finalize maintenance command syntax/tooling, key initialization/rotation/retirement procedures, and restore/access-reconciliation enforcement. The approved session invalidation and certificate-retention rules are mandatory, not pending choices.
- **[NEW]** Verify route-specific empty-confirm previews and resolve multi-partition continuation/aggregation semantics without Gateway changes or feature reduction. Investigation approval is not compatibility evidence.
- **[NEW]** Complete deadline propagation, lifecycle sequencing, scan-bound validation, and remaining request/resource limits. Existing package/deployment selections, executable tests, compatibility evidence, and all-severity zero-CVE release gates remain required.

**[NEW]** This batch updates specifications only; no application code, Gateway files, tests, credentials, key stores, or deployed resources are changed. Runtime tests and security evidence remain pending. Keep diff history until corresponding task actions are created under the pipeline rules.

## 10. Approved Detailed Contract Batch 3

**[NEW]** Approved on 2026-09-25: all six proposed decisions were accepted. This section supersedes earlier pending-choice statements only for the contracts it explicitly defines. It does not change Gateway or authorize application implementation, scope reduction, or a Step 8 readiness sign-off.

### 10.1 Response and Audit Metadata

**[NEW]** JSON operation-result responses use `{data, meta: {requestId, auditStatus}}`. Preserve the business result in `data`, including per-item outcomes and HTTP 207 for partial results. `requestId` is the correlation identifier. The fixed audit-status values are:

| Value | Meaning |
|---|---|
| `recorded` | **[NEW]** Required audit recording for the returned result completed. |
| `recording_failed` | **[NEW]** Post-execution result recording failed; preserve the known business outcome and show a persistent warning. |
| `not_required` | **[NEW]** The applicable audit policy requires no recording for this operation. Never use this to bypass emergency-action or other mandatory auditing. |

**[NEW]** File downloads retain their original contents and expose equivalent correlation/audit metadata through response headers. The frontend checks metadata before presenting success, including download success. This does not authorize a payload wrapper inside an exported definitions file. Exact download metadata header names and response-finalization behavior remain to be specified.

**[NEW]** Pre-execution audit failure still blocks execution; unknown business outcomes remain unknown. The existing classified error envelope in section 8.5 is not replaced by a successful-result wrapper. Application-list `{items, page}` results occupy `data` when returned through the JSON result envelope. Redirects, OIDC callbacks, and responses without a body do not acquire an invented JSON body through this rule.

**[NEW]** Verification must distinguish known success with failed audit recording, partial 207 results, and genuinely failed/unknown operations; assert preserved payloads, metadata inspection, persistent warnings, and no automatic business retry. Download checks must verify byte-preserved file content and equivalent metadata handling.

### 10.2 Role and Assignment Revision Preconditions

**[NEW]** Return a strong `ETag` containing the quoted revision UUID for a role or assignment representation. An update requires that exact value in `If-Match`. Missing preconditions return 428; an outdated revision returns 412. Reject wildcard updates and never silently overwrite another administrator's changes. A weak validator does not satisfy the exact strong-revision requirement.

**[NEW]** Revision comparison and the write must be atomic; a preliminary client or server read is insufficient to prevent a concurrent overwrite. Preserve the existing durable audit attempt and atomic local change/successful-result transaction. Verification must include two updates using the same revision, with only one committed change, and missing/stale/wildcard precondition cases. Detailed malformed-header errors and representation schemas remain part of the endpoint contract work.

### 10.3 Application-Owned List Pagination

**[NEW]** Roles, assignments, and audit history accept `pageNumber` starting at 1 and `pageSize` defaulting to 50 with a maximum of 500. Their list result is `{items, page: {number, size, total}}`, carried as `data` under section 10.1. `total` is the total matching item count, not merely the count returned on the current page. Retain all applicable authorization and approved audit filters.

| List | Stable ordering |
|---|---|
| Roles | **[NEW]** Normalized name ascending, then ID ascending. |
| Assignments | **[NEW]** ID ascending. |
| Audit events | **[NEW]** UTC timestamp descending, then ID descending. |

**[NEW]** Gateway-backed lists retain their existing pagination contracts; this decision does not rename Gateway parameters or change upstream ordering. Test default/maximum sizes, invalid bounds, empty results, filtering, and tied primary sort values. Stable ordering does not imply snapshot isolation across multiple requests while data changes.

### 10.4 Throttle Window and Admission

**[NEW]** Count failed emergency password verifications in a rolling 15-minute window until the fifth failure activates the delay sequence in section 9.4. Once triggered, retain escalation until a successful verification or 15 minutes without a failed verification. An early rejected request does not run password hashing or increment failures, and is not a failed verification that extends the inactivity reset.

**[NEW]** Serialize verification admission for the same account/source-address pair so concurrent requests cannot bypass its threshold or delay. Enforce the previously approved application-wide maximum of two simultaneous password verifications. When both slots are occupied, return 429 with `Retry-After: 1`, without queuing, hashing, or incrementing failures. Preserve the no-waiting-queue rule; serialization must not introduce an unbounded request queue.

**[NEW]** A rolling window requires enough persisted history to distinguish failures inside and outside that window; the section 8.4 counter/window field sketch is not, by itself, a complete rolling-window storage design. Final storage and atomic admission mechanisms remain part of the provider-schema work. Test burst concurrency, rolling-window boundaries, escalation persistence, reset behavior, overload response, and zero hash invocations for rejected admission.

### 10.5 Atomic Activity and Expiry Boundary

**[NEW]** A session is expired when `now >= expiry`, for either idle or absolute expiry. Atomically update activity only if the stored session is unrevoked and both deadlines remain valid. Compare against the existing idle deadline before renewing it, using server time; set the activity timestamp to the later of its existing value and server time. Concurrent requests must not move activity backward.

**[NEW]** Logout or revocation must never be undone by a competing activity update. The operation must preserve revocation state and cannot recreate or reactivate an invalidated session. Absolute expiry never moves. The explicit-user-activity classification and 4-hour idle / 8-hour absolute limits remain unchanged.

**[NEW]** Controlled-clock and real-provider concurrency tests must cover one instant before expiry, exact equality, after expiry, out-of-order activity writes, and logout/revocation racing with activity. Validate equivalent behavior on SQLite and PostgreSQL; no such tests have run for this specification update.

### 10.6 Provider-Specific OIDC Callbacks

| Provider | Fixed callback path |
|---|---|
| Entra ID | **[NEW]** `/signin-oidc/entra` |
| Cognito | **[NEW]** `/signin-oidc/cognito` |

**[NEW]** Register each path as an exact HTTPS redirect URI under the application's configured public origin at its provider. These callback paths are outside the `/api/v1` application-endpoint prefix. Bind each callback to its configured authentication scheme and retain issuer/audience, state, nonce, correlation, and PKCE validation. They do not use the browser API antiforgery-header requirement.

**[NEW]** Permit only validated same-origin relative return paths; reject external and protocol-relative destinations. Never automatically resume a mutation after authentication. Verification must cover both providers in one deployment, callback/scheme mismatch, invalid protocol binding, and external/protocol-relative return-path rejection.

### 10.7 Remaining Decisions and Verification Gate

**[NEW]** Design status remains `STATUS: BLOCKED`; release verification remains `PENDING`. Approval of these contracts is not approval to start Step 9 or to waive the release gates.

**[NEW]** This list records the gaps at batch 3. Section 11 supersedes the explicitly resolved choices; section 11.7 is the current remaining-decision list.

- **[NEW]** Complete per-operation request/response DTOs and permission/tier/audit bindings, application endpoint field schemas, error/outcome enumerations, malformed-precondition behavior, and download metadata header names/finalization. The approved result wrapper, ETag rule, pagination, and callback paths are no longer pending choices.
- **[NEW]** Finalize provider types/lengths/nullability/indexes/constraints, session/token representation and atomic database operations, persisted rolling-window throttle storage/admission mechanics, and retention queries. Preserve the approved expiry boundaries, throttle escalation/reset, and overload responses.
- **[NEW]** Finalize maintenance and key-management commands/procedures and enforceable restore/access reconciliation, using the approved session invalidation and certificate-retention rules.
- **[NEW]** Resolve empty-confirm HTTP preview compatibility and multi-partition continuation/aggregation semantics without Gateway changes or feature reduction. No source inspection or design approval substitutes for the required compatibility checks.
- **[NEW]** Complete deadline propagation, lifecycle sequencing, scan-bound validation, and remaining resource limits. Package/deployment selections, executable tests, compatibility evidence, and zero-CVE release gates remain required.

**[NEW]** This is a documentation-only approval record. No application or Gateway code, deployed resources, credentials, or key material changed; no runtime tests or security scans were performed. Preserve earlier history and pending diff markers until task actions exist.

## 11. Approved Detailed Contract Batch 4

**[NEW]** Approved on 2026-09-25: all six proposed decisions were accepted. These choices refine earlier sections without changing Gateway. They do not approve a complete continuation algorithm, the entire visual-design draft, or Step 8 readiness. Superseded pending-choice statements are historical; only the explicit decisions below are resolved.

### 11.1 Conditional Topic-Details Permission

**[NEW]** Snapshot-based browsing, searching, and replay require `gateway.t2` alongside the selected operation permission when the UI backend must discover partition bounds through T2. Never grant T2 implicitly or perform a T2 call solely because the principal has M1, M3, M4, or M8. Authorize T2 for the same configured cluster before the metadata call; apply the existing per-request audit and session rules.

**[NEW]** Operations with sufficient explicit inputs retain their existing permission requirements; this is not a blanket T2 prerequisite for every message request. A user may open an otherwise permitted operation form, but discovery-dependent execution must stop with an actionable permission explanation when T2 is absent. Reused bounds, continuation state, and changed inputs must obey the eventual validated continuation contract; permission approval alone does not prove those inputs sufficient.

**[NEW]** Test operation-only access with sufficient inputs, rejection of discovery without T2 with zero unauthorized metadata calls, permitted discovery with both permissions, cross-cluster denial, and permission revocation before a subsequent metadata request. Gateway remains unchanged, and stable bounds/ordering/aggregation still require compatibility investigation.

### 11.2 Download Metadata and Export Limit

**[NEW]** File downloads expose `X-Request-Id` and `X-Kafka3O-Audit-Status`. Use the same correlation identifier and `recorded`, `recording_failed`, or `not_required` semantics as JSON metadata in section 10.1. The frontend checks these headers before displaying success and retains a persistent warning for failed result recording.

**[NEW]** Finish fetching the export and attempting required audit-result recording before sending response headers. Required pre-execution audit failure still prevents the upstream action. Preserve the export file contents: do not inject metadata or the UI JSON response wrapper into them.

**[NEW]** Apply a UI export limit of 10,000,000 bytes. Exports exceeding it fail explicitly; never silently truncate or return a partial file as successful. This is a newly approved UI limit, not a claim about Gateway's configured restriction. Buffering/storage mechanics must remain bounded and within the operation deadlines; their concrete implementation remains to be specified.

**[NEW]** Verify byte-preserved exports, headers consistent with actual audit recording, no early header commit, exact-limit acceptance, over-limit failure, and no successful partial file after upstream failure. Never replay a business operation to repair result-audit failure.

### 11.3 Error Outcome Enumeration

| Error envelope `outcome` | Required semantics |
|---|---|
| `not_started` | **[NEW]** The business operation did not start. Use for validation, permission denial, and failed required pre-execution audit. |
| `failed` | **[NEW]** Failure is established; this does not imply rollback or prove that no effects occurred. Preserve reported progress/details. |
| `unknown` | **[NEW]** The business outcome is not established, including ambiguous mutations after transport failure. Never automatically retry. |

**[NEW]** These are error-envelope outcomes, separate from audit status. A known successful operation with `auditStatus: "recording_failed"` remains a known business success. Partial results retain HTTP 207 and per-item outcomes instead of becoming generic errors. Verify these distinctions through pre-execution, established-failure, partial-result, and ambiguous-transport scenarios.

### 11.4 Exact Revision-Header Validation

**[NEW]** Accept exactly one strong, quoted UUID revision in `If-Match` for role/assignment updates. Missing `If-Match` returns 428. Malformed, weak, wildcard, or multiple values return 400. A valid but stale revision returns 412. No business write occurs on any rejection; required rejection auditing is not an authorization-data write.

**[NEW]** Successful updates return the new revision through the strong ETag contract. Preserve section 10.2's atomic compare-and-write and local change/result audit transaction. Verify every rejection category and that two updates with the same initial revision cannot both commit.

### 11.5 Cross-Provider Persistence Conventions

| Concern | Approved convention |
|---|---|
| UUID values | **[NEW]** Native UUIDs in PostgreSQL; canonical UUID text in SQLite. |
| Stored timestamps | **[NEW]** UTC epoch-millisecond integers in both providers. This storage choice does not relax browser-boundary numeric-precision rules. |
| Session hashes | **[NEW]** 32-byte binary SHA-256 session hashes; never raw session bearer identifiers. |
| Equivalent behavior | **[NEW]** Explicit provider constraints and tests enforce equivalent semantics rather than relying on differing implicit database behavior. |
| Role names | **[NEW]** Provider-independent normalization for role-name uniqueness. |
| Identity/claim matching | **[NEW]** Preserve case-sensitive identity and claim matching; role-name normalization must not merge principals or alter claim matching. |

**[NEW]** Final table definitions must enumerate lengths, nullability, indexes, relationships, and constraints. Exact canonical UUID formatting and role-name normalization algorithms still require definition; these conventions do not claim complete schemas. Persistence tests must cover both real providers, including duplicate normalized names, case-distinct identity/claim values, timestamp boundaries, and fixed hash length.

### 11.6 Scheduled Audit Retention

**[NEW]** Run audit-retention cleanup hourly in batches of at most 1,000 events, using the deployment-configured retention period, default 90 days. Delete only events strictly older than the cutoff; an event exactly at the cutoff remains. Expired unresolved attempts are eligible without changing their classification to success or failure. No interactive audit-deletion capability is introduced.

**[NEW]** Cleanup failure produces an operational alert and retries at the next scheduled run. It never disables required audit recording or enables an audit bypass. Preserve in-window records even when their related attempt/result record is expired; final relationship/deletion rules must support the retention invariant without unintended cascading deletion.

**[NEW]** Tests must cover the exact cutoff, configurable retention, expired unresolved attempts, bounded batches, preservation of in-window records, and failed-cleanup alert/next-run behavior on both providers. The cleanup alert mechanism and concrete scheduling/query implementation remain to be specified.

### 11.7 Remaining Decisions and Verification Gate

**[NEW]** Design status remains `STATUS: BLOCKED`; release verification remains `PENDING`. This approval does not authorize Step 9 or waive any release gate.

- **[NEW]** Complete per-operation DTO/permission/tier/audit bindings, application field schemas and error codes, and bounded export buffering/error handling. The conditional T2 permission, download headers/limit, error outcomes, and revision rejection rules are now selected.
- **[NEW]** Finalize provider table definitions, UUID/role-name normalization details, atomic session/throttle storage operations, and retention relationships/queries/scheduler/alert delivery under the approved conventions.
- **[NEW]** Finalize maintenance/key-management commands and enforceable recovery/access reconciliation, deadline propagation, lifecycle sequencing, scan-bound validation, and remaining resource limits.
- **[NEW]** Resolve empty-confirm HTTP preview compatibility and multi-partition continuation/aggregation without Gateway changes. Conditional T2 authorization enables a possible discovery step, not proof of a correct continuation algorithm.

**[NEW]** Evidence boundary: the preceding investigation ran existing focused Go tests in `internal/api`, `internal/service/message`, `internal/service/core`, and `internal/scan` successfully for replay, single-partition cursor resume, dry-run sequencing, and scan continuation/latest behavior. This is limited fake-backed/source-level evidence, not an executed UI adapter, a test of every empty-confirm HTTP route, multi-partition orchestration proof, or a deployed-Gateway integration result. This approval update itself runs documentation checks only; application tests, artifact compatibility, and all-severity zero-CVE release verification remain pending.

## 12. Approved Consolidated Contracts

**[NEW]** Approved on 2026-09-25 by the user's "approve" response to the consolidated decision package. [CONSOLIDATED-PROPOSAL.md](CONSOLIDATED-PROPOSAL.md), revision 0.2, is incorporated by reference as a normative contract addendum. Its sections 2-6 implement approved decisions P1-P6; section 7 is historical compatibility evidence, section 8 preserves unresolved design blockers, and section 9 defines mandatory acceptance and handoff criteria. Its original proposal labels are retained history, not pending approval of P1-P6. This approval does not approve the entire visual-design draft.

### 12.1 Adopted Contracts and Precedence

| Decision | Normative addendum section | Approved selection |
|---|---|---|
| P1 | 2 | All 47 explicit operation/DTO/permission/tier/audit bindings, pinned Gateway schema reference, numeric transformations, message/upload exceptions, and safe status preservation. |
| P2 | 3 | Application DTOs, 16 method/path contracts, exact validation and error catalog; Assignment.enabled supports individual mapping revocation, and optional typed replay-error progress preserves acknowledged work. |
| P3 | 4 | Provider types/limits/constraints/indexes, role normalization, duplicate assignment detection, atomic session/access/throttle operations, retention scheduling and alerts. |
| P4 | 5 | Bounded upload/export/response handling, admission, deadline propagation, probes, startup and shutdown. Required functionality must fit approved limits; failures do not authorize silent scope reduction. |
| P5 | 6 | Explicit key initialization/verification, stopped-app migrations, backup/restore, recovery marker and access reconciliation, certificate rotation, and failure/exit semantics. |
| P6 | 2.3 and 7 | Explicit empty confirmation on initial dry-run requests for the 18 tested confirmation-bearing operations; execution still requires the exact target or plan token. |

**[NEW]** These selections supersede earlier pending-choice statements only for their explicit subjects, including the corresponding items in section 11.7. Preserve all other approved constraints: conditional T2 discovery permission, current per-call authorization, no inherited override, audit gates, no automatic ambiguous mutation retry, one non-overlapping replica, and all-severity zero-CVE release policy. The addendum's new fields and limits are expressly approved; no other behavior is introduced by implication. Gateway remains unchanged.

### 12.2 Remaining Design Blockers

**[NEW]** P7 is approved as retention of these blockers and authorization for further isolated adapter investigation, not approval of an algorithm or extra continuation DTO:

- **B1:** Native latest-mode preceding-window continuation and completion reporting cannot yet satisfy the retained UI contract. The probes reproduced an empty preceding window and a byte-bound scan reporting completion without a stop reason.
- **B2:** Per-partition explicit-window primitives do not prove aggregate multi-partition ordering, global bounds, buffered-record handling, sparse/compacted offset behavior, or ambiguous replay outcomes. The bounded continuation-state ownership, shape, expiry, tamper protection, and concurrency contract remains unresolved.

**[NEW]** Resolve B1/B2 without changing Gateway or silently reducing requirements. The addendum's investigation direction remains non-normative until its design and proof are reviewed and approved. Section 12 is an approval record, not a complete Step 8 audit or a claim that no further audit findings are possible.

### 12.3 Evidence and Handoff Gate

**[NEW]** Design status remains `STATUS: BLOCKED`; release verification remains `PENDING`. Historical evidence in the addendum records six top-level tests and 20 subtests against actual HTTP handlers with fake Kafka, including the 18 initial-preview routes. Two tests deliberately reproduce limitations, not passing product criteria. That evidence does not establish real Kafka, full adapter correctness, large-offset precision, browser/application behavior, or release security.

**[NEW]** Recording this approval runs documentation consistency checks only; the external harness was not edited or rerun. Test/deployment pins and mandatory implementation/integration/security evidence remain pending. Once the compatibility design is resolved, perform the full Step 8 review and obtain separate user sign-off. Only an approved `STATUS: READY` permits Step 9. No task plan, application code, commit, or release authorization is created by this approval.

### 12.4 Approved B1/B2 Recommendations

**[NEW]** On 2026-09-25 the user approved the recommended B1/B2 approach and starting limits. Incorporate [CONSOLIDATED-PROPOSAL.md](CONSOLIDATED-PROPOSAL.md), revision 0.3, section 8.1 as normative selections: explicit fixed per-partition offset windows, truthful incomplete results, and server-memory continuation state with session/cluster-bound 32-random-byte tokens; 10-minute idle and 30-minute absolute lifetime bounded by session expiry; at most 2 workflows per session and 20 overall; buffered-data limits of 20,000,000 bytes per workflow and 100,000,000 overall. Serialize continuation, reject competing requests and capacity overload explicitly, never silently evict active workflows, and require explicit restart on expiry/state loss with replay duplicate-risk warning. Recheck permissions on every continuation and never automatically retry uncertain writes. No message-payload persistence or Gateway modification is approved.

**[NEW]** These selections supersede section 12.2's unresolved ownership/expiry/limit direction only to the stated extent. They do not select an exact workflow API, full state machine, token transport, byte-accounting/admission algorithm, idle-refresh semantics, ordering tie rule, or lost-response protocol. The addendum's section 8.2 identifies remaining contract work. Buffered-data caps are not a measurement of total process memory; implementation must account for overhead without silently relaxing the selected limits.

**[NEW]** B1/B2 remain unresolved pending complete contract decisions and executable compatibility proof. `STATUS: BLOCKED` and release verification `PENDING` are unchanged. This approval update performs documentation checks only; historical compatibility results are not new evidence. It does not approve the whole visual-design draft or authorize Step 9.

### 12.5 Approved Workflow Recommendations

**[NEW]** On 2026-09-25 the user approved all six further workflow recommendations. Incorporate [CONSOLIDATED-PROPOSAL.md](CONSOLIDATED-PROPOSAL.md), revision 0.4, section 8.3 as normative W1-W6: separate create/advance/inspect/stop operations with tokens in a dedicated header, never URLs/logs; immutable operation/cluster/topics/partitions/filters/bounds; expected-revision advancement with rejection of stale/competing requests and no duplicate replay dispatch; states `ready`, `running`, `paused`, `completed`, `stopped`, `unknown`; idle refresh only for accepted user-directed advancement, with expiry stopping new calls while bounded result auditing finishes; reserve capacity before fetching and account for retained copies/in-flight buffers without silently dropping unreturned records.

**[NEW]** These choices supersede earlier pending statements only for the stated principles. Existing workflow limits, per-call authorization/auditing, request-scoped overrides, and no automatic uncertain-write retry remain mandatory. Returning an already-retained result is not repeating the Kafka mutation and cannot bypass current authorization. This does not claim exactly-once delivery or authorize an unbounded result cache.

**[NEW]** The addendum's section 8.4 now lists remaining exact API/DTO/header, revision/request identity, state-transition/error, expiry/cleanup, memory-accounting, and ordering/algorithm decisions and proof requirements. No new workflow route has been selected by implication. B1/B2 remain open, `STATUS: BLOCKED`, release verification `PENDING`; full Step 8 review and separate sign-off still precede Step 9. Only documentation checks are performed for this approval; Gateway and external compatibility harness are unchanged.

### 12.6 Approved Item-1 Contract Package

**[NEW]** On 2026-09-25 the user approved the six concrete recommendations for item 1. Incorporate [CONSOLIDATED-PROPOSAL.md](CONSOLIDATED-PROPOSAL.md), revision 0.5, section 8.5 as normative I1-I6: four UI-backend routes at `/api/v1/clusters/{clusterId}/message-workflows` (POST/GET base, POST `/advance`, POST `/stop`); `X-Kafka3O-Workflow-Token` using unpadded base64url for 32 random bytes, browser-memory-only retention, telemetry redaction and no-store; typed create/advance selections and metadata-only inspection; strong UUID revision plus client UUID `advanceId`, current authorization before duplicate lookup, duplicate lookup before stale-revision rejection, no repeated dispatch, latest-result retention until acknowledged by the next accepted advancement or expiry; selected six-state transitions with `stopRequested` and uncertainty precedence; selected 428/412/409/429/413/404 error uses and expiry cleanup; actual allocated-buffer accounting, atomic reservation and separate metadata caps of 1,000,000 bytes per workflow and 20,000,000 overall.

**[NEW]** Preserve approved buffered-data caps of 20,000,000 bytes per workflow and 100,000,000 overall, 2 workflows per session and 20 overall, 10-minute idle/30-minute absolute lifetime bounded by session expiry, all per-call authorization/audit gates, request-scoped confirmation/overrides, and no automatic uncertain-write retry. Creation does not perform replay writes. Inspection and duplicate-result retrieval do not renew idle. No silent partition omission or record loss is authorized. These four workflow routes supplement, rather than replace, the 16 existing application routes and 47 Gateway-operation bindings. Gateway remains unchanged.

**[NEW]** This supersedes earlier pending statements only for the explicit I1-I6 selections. Addendum section 8.6 tracks complete field-level schemas, remaining state/error/stop semantics, bounded request-identity history, cleanup/accounting mechanics, and latest/multi-partition algorithm and proof still required. Design remains `STATUS: BLOCKED`; release verification remains `PENDING`. Only documentation consistency checks are performed for this approval; no harness rerun, application test, benchmark, or security clearance is claimed. Full Step 8 review and separate approved READY sign-off still precede Step 9; no task plan or implementation is authorized here.

## 13. Approved Reduced-V1 Scope and Contracts

**[NEW]** Approved on 2026-09-26. Adopt FUNC-SPEC 0.6 section 1.5 and [CONSOLIDATED-PROPOSAL.md](CONSOLIDATED-PROPOSAL.md) revision 0.6 section 11 as the controlling first-release profile. This explicitly approved reduction supersedes earlier requirements to deliver every Gateway capability in v1, while preserving those requirements as deferred history. No Gateway modification or additional unapproved feature reduction is authorized.

### 13.1 Active V1 Surface

**[NEW]** Keep all cluster, topic, consumer-group, SCRAM and quota operations, plus M2 and M5-M7. M1/M3/M4 are one-shot bounded scans with exactly one explicit partition and explicit start/end offset selections; retain all applicable regex/JSONPath fields/operators and data semantics. Enforce restrictions in the backend with existing validation errors and zero scan dispatch on invalid/unsupported selection. Preserve Gateway record order and scan information; no automatic continuation or cross-request snapshot/exhaustive-search promise.

**[NEW]** Active totals are 40 command IDs / 46 Gateway-operation bindings / 49 permission literals, plus the existing 16 application routes. Exclude `gateway.m8` from active permission input/output/storage catalogs and do not register replay or message-workflow routes. The source Gateway schema still enumerates 41 command IDs / 47 operations; compare the v1 projection to that unchanged fixture rather than changing Gateway or its schema. The active destructive-preview set has 17 operations; historical 18-route evidence includes M8.

**[NEW]** Preserve dual SSO, emergency access, application roles/assignments, session expiry/revocation, audit durability, SQLite/PostgreSQL, maintenance/recovery, single-replica deployment, and every safety/release gate for retained operations. Emergency access cannot enable an excluded feature. Conditional T2 permission remains required only for actual optional metadata discovery, not sufficient explicit scan inputs.

### 13.2 Deferred Features and Removed V1 Complexity

**[NEW]** Defer M8 in full, including preview, replay and re-drive; latest-N and preceding-window message browsing; multi-partition M1/M3/M4; beginning/timestamp selectors for those three operations; resumable message browsing/search; and cross-request snapshot guarantees. Timestamp/multi-partition inputs on other retained operations are unchanged.

**[NEW]** Sections 12.4-12.6 and addendum section 8's workflow API/token/revision/identity-ledger/retained-result/expiry/stop/memory-manager contracts are deferred with their feature. Do not scaffold a v1 ReplayService or workflow subsystem merely because the earlier topology/examples named one. Keep ordinary feature services and request-local bounded response handling. Role/assignment revisions, session state, audit history, and operational recovery are not deferred.

**[NEW]** B1/B2 remain unresolved for deferred features; they are not v1 adapter dependencies or passing compatibility results. New scope approval, completed contracts and appropriate proof are required before reintroduction. No exactly-once or replay-recovery capability is introduced.

### 13.3 V1 Completion, Resources and Verification

**[NEW]** Scans preserve Gateway `reachedEnd`, `stoppedBy`, counts and cursor information, but item count, empty output or timeout alone never establish completion. Sparse/compacted logs can yield incomplete results; requested bounds are not evidence of immutable content or complete coverage. A separate user submission is an independent query. Use ordinary loading/result/error states; cancellation never claims rollback or non-execution.

**[NEW]** Keep addendum section 5's request-local limits, deadlines and concurrency, including the 20,000,000-byte other-Gateway-response cap. Bound allocations and release request buffers on all exits; no server-side retained message-result cache. Existing browser transient-state and no-store rules apply. Partial/unknown outcomes and no automatic ambiguous retry remain mandatory for all retained mutations.

**[NEW]** Addendum section 11.4 and FUNC-SPEC's revised V1/V12/V15 govern active acceptance. Test exactly 46 route bindings and 49 permissions, replay/workflow absence, unsupported scan rejection, one-partition explicit-offset scans, sparse/bounded/empty behavior, precision/data integrity, authorization/audit/override gates, buffer cleanup and cancellation. Preserve all retained V1-V20 obligations and normal database/browser/integration/deployment/security gates. Deferred-feature checks are explicitly deferred, never reported as passes or substituted for tests of retained behavior.

### 13.4 Approval and Handoff Status

**[NEW]** `STATUS: BLOCKED` pending the full reduced-v1 pipeline Step 8 consistency review and separate approved READY sign-off. B1/B2 are now deferred-feature blockers rather than retained-v1 requirements. Release verification remains `PENDING`; scope approval is neither compatibility proof nor security clearance. No task creation or implementation is authorized by this approval record.

**[NEW]** This update runs documentation consistency checks only. Gateway and the external compatibility harness remain unchanged; no new runtime, browser, real Kafka, memory benchmark, or vulnerability evidence is claimed. The design document's scope/navigation is aligned, but its visual/UX draft is not approved by this decision.