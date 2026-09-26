# Implementation Tasks

**Product:** Kafka3O-UI v1 (reduced-v1 scope)
**Sources:** FUNC-SPEC 0.7, TECH-SPEC 0.18 (Spec Audit section 15 and addendum section 16.6: `STATUS: READY`), CONSOLIDATED-PROPOSAL 0.7, DESIGN-SPEC 0.9
**Plan status:** Approved by the user on 2026-09-26 (pipeline Step 9). Release verification remains PENDING (TECH §15.4).

## Conventions

- **Citations:** `FUNC §x` = FUNC-SPEC, `TECH §x` = TECH-SPEC, `ADD §x` = CONSOLIDATED-PROPOSAL, `DES §x` = DESIGN-SPEC, `V1`-`V20` = FUNC §3.8 validation criteria.
- **Paths:** Only `LICENSE` and `spec/*.md` exist today. Every other path in this plan is **Proposed** and derived from the approved topology (TECH §5), unless marked **Existing**. Symbol names are proposed implementation guidance, not new product contracts.
- **Commands:** Commands that depend on files created by this plan are unverified until those files exist. Step 10 supplies the final executable Definition of Done for each task.
- **Hierarchy:** Phase N -> Task N.M -> Subtask N.M.K. Each phase ends in a runnable, manually testable application.

## Planning Assumptions (approved with this plan)

1. **Manual test environment:** real Kafka3O-Gateway at pinned revision `91b7a24` against a disposable Kafka cluster, served over native TLS; an external disposable PostgreSQL 18.6 database; SSO verified by automated mock-issuer suites only; GitHub Actions for the PR and nightly gates.
2. **Spec clarifications S1-S5** (recorded in TECH-SPEC sections 16.1-16.5): S1 per-cluster bounds must not *exceed* Gateway ceilings; S2 `maintenance emergency hash-password`; S3 `maintenance database migrate --initial` for an empty database; S4 `ClusterView` adds `environmentDisplayName` and `environmentLabel`; S5 the browser sends a lock-override reason in `X-Break-Glass-Reason` on the single request, validated by the backend before forwarding.
3. **Topology additions:** `src/Kafka3O.UI.Server/Infrastructure/Hosting/` (pipeline, headers, health, locks, metrics), `src/Kafka3O.UI.Server/Infrastructure/Maintenance/` (maintenance command host), `src/Kafka3O.UI.Client/Features/Shared/` (shared components from DES §9), `.github/workflows/`, `.config/dotnet-tools.json` (pinned `dotnet-ef`), `.gitignore`, `coverage.runsettings`.
4. **Local PostgreSQL for tests:** persistence suites use Testcontainers PostgreSQL 18.6 when a container runtime exists, or the disposable database named by environment variable `KAFKA3O_TEST_POSTGRES_CONNECTION`; otherwise they report *skipped/not verified*, never passed. CI uses Testcontainers.
5. **Security tooling:** NuGet vulnerability checks use the built-in `dotnet list package --vulnerable --include-transitive`. SBOM and container-scanner tool selection happens in Task 23.4 under normal dependency approval.

## Local Manual Test Environment

Used by every Manual Test Plan below. `config/README.md` (Task 1.3.5) documents each step.

| Item | Setup |
|---|---|
| SDK | .NET SDK 10.0.401 installed (`dotnet --version` prints `10.0.401` at the repo root). |
| UI | `dotnet run --project src/Kafka3O.UI.Server` with `ASPNETCORE_ENVIRONMENT=Development`; configuration in `src/Kafka3O.UI.Server/appsettings.Development.json` and secret files in `config/local/` (both gitignored). UI at `http://localhost:8080` (Chrome or Edge treat `localhost` as a secure context for `__Host-` cookies). |
| Emergency password | `Correct-Horse-1`, hashed with `maintenance emergency hash-password`. |
| Gateway `local` | Kafka3O-Gateway `91b7a24` with `http.addr: ":8443"`, native TLS using a self-signed certificate `config/local/gateway.crt`/`.key`, reader and operator keys from `keygen`; UI registration `local` in environment `dev` with `Tls:CaCertificateFile` = `config/local/gateway.crt`. |
| Gateway `offline` | UI registration `offline` in environment `staging` with `BaseUrl` `https://localhost:9` (nothing listening). |
| PostgreSQL | External disposable PostgreSQL 18.6 database `kafka3o_ui_manual`; connection string in `config/local/pg.conn`. |
| Tools | Git Bash (`curl`, `openssl`), `sqlite3` CLI and PostgreSQL 18 `pg_dump`/`pg_restore`/`psql` (Phase 21), Helm 3 (Phase 22), Kafka CLI tools for consumer-group fixtures (Phase 15). |
| Session cookie for curl | Copy `__Host-Kafka3O.Session` from browser DevTools into `S`; use `curl -b "__Host-Kafka3O.Session=$S"`. |

---


## Phase 1: The application shell runs from validated configuration

- **Phase Status:** Not Started
- **Goal:** An operator builds the solution, starts the server from a sample configuration, sees the Kafka3O-UI sign-in page with the approved security headers, and gets a clear refusal naming the key when configuration is invalid.
- **Manual Test Plan:**
  1. Run `dotnet --version` at the repo root. Expect `10.0.401`.
  2. Run `dotnet build Kafka3O.UI.slnx`. Expect `Build succeeded` with 0 warnings and 0 errors.
  3. Run `printf 'Correct-Horse-1\n' | dotnet run --project src/Kafka3O.UI.Server -- maintenance emergency hash-password > config/local/emergency.hash`. Expect exit code 0, one base64 line in the file, and no password echoed.
  4. Follow `config/README.md` to create the Data Protection certificate, key files and `appsettings.Development.json`, then run `dotnet run --project src/Kafka3O.UI.Server`. Expect a log line `Now listening on: http://[::]:8080`.
  5. Run `curl -i http://localhost:8080/health/live`. Expect `200`, body `{"status":"live"}`, and headers exactly: the TECH §14.7 `Content-Security-Policy`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security: max-age=31536000`.
  6. Run `curl -i http://localhost:8080/api/v1/does-not-exist`. Expect `404` with a JSON body containing `"code":"NOT_FOUND"` and a UUID `requestId`. Run `curl -i http://localhost:8080/signin-oidc/x`. Expect `404` and no HTML.
  7. Open `http://localhost:8080/` in Chrome. Expect redirection to `/signin` showing the heading "Kafka3O-UI" in Source Sans 3, and no CSP violation in the DevTools console. Open `http://localhost:8080/no-such-page`. Expect a "Page not found" view.
  8. Set `Kafka3O:Gateways:0:Bounds:MaxBytes:Max` to `10000001` and restart. Expect the process to exit non-zero with a log naming `Kafka3O:Gateways:0:Bounds:MaxBytes:Max`. Restore the value.
  9. Add an unknown key `Kafka3O:Colour` and restart. Expect exit non-zero naming `Kafka3O:Colour`. Remove it.
  10. Write `SENTINEL-SECRET-123` into `config/local/local-reader.key`, set `Gateways:0:BaseUrl` to `http://localhost:8443`, and restart. Expect exit non-zero naming `Kafka3O:Gateways:0:BaseUrl`, with no occurrence of `SENTINEL-SECRET-123` in the console output. Restore both.

### Task 1.1: Scaffold the solution and build settings

- **Status:** Not Started
- **Source:** TECH §1.2, §1.6 item 1, §5.1, §5.2, §5.4
- **Outcome:** One solution with the three approved production projects builds warning-free on the pinned SDK with central package versions and lockfiles.
- **Dependencies:** None
- **Affected Files:** Proposed `global.json`, `Directory.Build.props`, `Directory.Packages.props`, `Kafka3O.UI.slnx`, `.gitignore`, `src/Kafka3O.UI.Server/Kafka3O.UI.Server.csproj`, `src/Kafka3O.UI.Client/Kafka3O.UI.Client.csproj`, `src/Kafka3O.UI.Contracts/Kafka3O.UI.Contracts.csproj`
- **Manual Test Mapping:** Phase 1 steps 1-2.
- **Subtasks:**
  - [ ] 1.1.1 Pin the SDK and shared build settings
    - **Source:** TECH §1.2 (SDK 10.0.401, `net10.0`), §1.6 item 1 (lockfiles), §5.4.
    - **Files:** Proposed `global.json` (create), `Directory.Build.props` (create), `Directory.Packages.props` (create).
    - **Symbols:** `global.json` `sdk.version`=`10.0.401`, `rollForward`=`disable`; MSBuild `TargetFramework`=`net10.0`, `Nullable`=`enable`, `ImplicitUsings`=`enable`, `TreatWarningsAsErrors`=`true`, `Deterministic`=`true`, `RestorePackagesWithLockFile`=`true`, `ManagePackageVersionsCentrally`=`true`.
    - **Implementation:** Declare only packages the current phase needs; Microsoft framework packages at 10.0.12 (`Microsoft.AspNetCore.Components.WebAssembly`, `Microsoft.AspNetCore.Components.WebAssembly.Server`). Later tasks add their packages here. Version ranges are not allowed.
    - **Dependencies:** None.
    - **Completion Check:** `dotnet --version` prints `10.0.401`; `dotnet restore Kafka3O.UI.slnx --locked-mode` succeeds once lockfiles are committed; a floating version fails review.
  - [ ] 1.1.2 Create the solution, projects, and ignore rules
    - **Source:** TECH §5.1 tree, §5.2 dependency direction, §5.4 (secrets and generated artifacts outside version control).
    - **Files:** Proposed `Kafka3O.UI.slnx`, the three `.csproj` files, `.gitignore` (all create).
    - **Symbols:** Server `Microsoft.NET.Sdk.Web` referencing Contracts and Client (for publishing Client assets); Client `Microsoft.NET.Sdk.BlazorWebAssembly` referencing Contracts only; Contracts `Microsoft.NET.Sdk` with no project references.
    - **Implementation:** `.gitignore` covers `bin/`, `obj/`, `TestResults/`, Playwright traces, `*.db`, `*.db-wal`, `*.db-shm`, `config/local/`, `src/Kafka3O.UI.Server/appsettings.Development.json`, and key-ring directories. No sibling-repository references.
    - **Dependencies:** 1.1.1.
    - **Completion Check:** `dotnet build Kafka3O.UI.slnx` succeeds with 0 warnings; `git check-ignore config/local/x` prints the path.

### Task 1.2: Maintenance command host and emergency hash tool

- **Status:** Not Started
- **Source:** ADD §6 (same executable, maintenance mode, exit codes, no secrets in arguments or output), TECH §16.2 (S2)
- **Outcome:** `dotnet run -- maintenance ...` dispatches without starting the web host; `maintenance emergency hash-password` produces an approved Identity V3 hash from stdin.
- **Dependencies:** Task 1.1
- **Affected Files:** Proposed `src/Kafka3O.UI.Server/Program.cs`, `Infrastructure/Maintenance/MaintenanceHost.cs`, `Infrastructure/Maintenance/MaintenanceResult.cs`, `Infrastructure/Maintenance/HashPasswordCommand.cs`, `tests/Kafka3O.UI.Server.Tests/Infrastructure/Maintenance/HashPasswordCommandTests.cs`
- **Manual Test Mapping:** Phase 1 step 3.
- **Subtasks:**
  - [ ] 1.2.1 Dispatch maintenance commands
    - **Source:** ADD §6 (exit codes 0/2/3/4/5; sanitized JSON output).
    - **Files:** Proposed `src/Kafka3O.UI.Server/Program.cs` (create), `Infrastructure/Maintenance/MaintenanceHost.cs`, `MaintenanceResult.cs` (create).
    - **Symbols:** `MaintenanceHost.RunAsync(string[] args, CancellationToken) -> int`; `MaintenanceExitCode` {Success=0, InvalidInput=2, Precondition=3, Validation=4, Execution=5}; `MaintenanceResult(command, status, extra)` serialized as sanitized JSON.
    - **Implementation:** When `args[0] == "maintenance"`, parse the command tree and run without Kestrel; unknown commands return 2. Commands other than `emergency hash-password` load and validate `Kafka3O` configuration (Phase 2 onward). Never print secrets.
    - **Dependencies:** 1.1.2.
    - **Completion Check:** `MaintenanceHostTests`: unknown command exits 2 with `{"status":"invalid_input"}`; no Kestrel listener starts.
  - [ ] 1.2.2 Implement `emergency hash-password`
    - **Source:** TECH §16.2, §7.2, ADD §3.2 (`/auth/emergency` password 1-4096 UTF-8 bytes, no normalization).
    - **Files:** Proposed `src/Kafka3O.UI.Server/Infrastructure/Maintenance/HashPasswordCommand.cs` (create).
    - **Symbols:** `HashPasswordCommand.RunAsync(TextReader stdin, TextWriter stdout, int iterations) -> int`.
    - **Implementation:** Read one line (no console echo when interactive); reject empty or over 4,096 bytes (exit 2); `PasswordHasher<EmergencyAccount>` with `IdentityV3` and `IterationCount = max(210000, --iterations)`; `--iterations` below 210,000 exits 2; print only the hash.
    - **Dependencies:** 1.2.1.
    - **Completion Check:** `HashPasswordCommandTests`: produced hash verifies with `VerifyHashedPassword`; header shows ≥210,000 iterations; `--iterations 1000` exits 2; stdout contains no password.

### Task 1.3: Configuration schema and startup validation

- **Status:** Not Started
- **Source:** TECH §14.3, §16.1 (S1), §7.5 (restart-only), FUNC §2.2, §2.1
- **Outcome:** The complete `Kafka3O` configuration binds, rejects unknown keys, validates every rule, reads secrets only from files, and refuses to start naming the offending key without printing values.
- **Dependencies:** Task 1.1
- **Affected Files:** Proposed `src/Kafka3O.UI.Server/Infrastructure/Configuration/Kafka3OOptions.cs`, `Kafka3OOptionsValidator.cs`, `SecretFileReader.cs`, `ConfigurationServiceCollectionExtensions.cs`, `src/Kafka3O.UI.Server/appsettings.json`, `config/appsettings.example.json`, `config/README.md`, `tests/Kafka3O.UI.Server.Tests/Infrastructure/Configuration/Kafka3OOptionsValidatorTests.cs`
- **Manual Test Mapping:** Phase 1 steps 4, 8-10.
- **Subtasks:**
  - [ ] 1.3.1 Define the options model and strict binding
    - **Source:** TECH §14.3 table.
    - **Files:** Proposed `src/Kafka3O.UI.Server/Infrastructure/Configuration/Kafka3OOptions.cs` (create), `ConfigurationServiceCollectionExtensions.cs` (create).
    - **Symbols:** `Kafka3OOptions` with `PublicOrigin`, `Database` (`Provider`: `Sqlite`|`PostgreSql`, `ConnectionStringFile`), `DataProtection` (`KeyRingPath`, `Certificates[]{CertificateFile, PrivateKeyFile}`), `Operations.StatePath`, `Emergency` (`AccountId`="emergency", `DisplayName`="Emergency access", `PasswordHashFile`, `CredentialVersion`), `Oidc.Entra?`/`Oidc.Cognito?` (`DisplayName`, `Issuer`, `ClientId`, `ClientSecretFile?`, `Scopes`, `AllowedClaimTypes`), `Network` (`TrustedProxies`, `TrustedNetworks`), `Audit.RetentionDays`=90, `Environments[]{Id, DisplayName, Label?}`, `Gateways[]{Id, DisplayName, EnvironmentId, BaseUrl, ReaderKeyFile, OperatorKeyFile, Tls.CaCertificateFile?, Bounds{Limit, MaxScan, MaxMatches, MaxBytes, MaxTimeMs, ThroughputSampleSeconds: {Default, Max}}}`; `AddKafka3OConfiguration(IServiceCollection, IConfiguration)`.
    - **Implementation:** Bind section `Kafka3O` with `BinderOptions.ErrorOnUnknownConfiguration = true`; apply defaults (Scopes `openid profile email`; AllowedClaimTypes Entra `roles`,`groups`, Cognito `cognito:groups`) only when a key is absent. Register with `ValidateOnStart()`.
    - **Dependencies:** 1.1.2.
    - **Completion Check:** Test `Binding_UnknownKey_Fails` names `Kafka3O:Colour`; `Binding_Defaults_Applied` asserts each default.
  - [ ] 1.3.2 Implement every validation rule
    - **Source:** TECH §14.3 rows; §16.1; ADD §3.3 configuration ID pattern; TECH §7.2 (210,000 iterations).
    - **Files:** Proposed `src/Kafka3O.UI.Server/Infrastructure/Configuration/Kafka3OOptionsValidator.cs` (create), `SecretFileReader.cs` (create).
    - **Symbols:** `Kafka3OOptionsValidator : IValidateOptions<Kafka3OOptions>`; `SecretFileReader.Read(string path) -> string` (UTF-8, trims one trailing newline, throws `SecretFileException(keyPath)` without the value).
    - **Implementation:** Validate: https origin without path/query/fragment; provider enum; absolute directories; ≥1 certificate with loadable PEM pair (`X509Certificate2.CreateFromPemFile`); ID pattern `[A-Za-z0-9][A-Za-z0-9._-]{0,63}` and uniqueness for environments and gateways; `EnvironmentId` exists; `BaseUrl` https with empty or `/` path; secret files readable and non-empty; Identity V3 hash header (format byte 0x01, PRF HMACSHA512, iterations ≥ 210,000); `CredentialVersion` 1-128 printable ASCII; OIDC `Issuer` https, `Scopes` contains `openid`, non-empty lists; IP/CIDR parse; `RetentionDays` 1-3650; each bound `1 <= Default <= Max` with UI ceilings (Limit ≤ 1,000; MaxMatches ≤ 1,000; MaxBytes ≤ 10,000,000; MaxTimeMs ≤ 25,000; ThroughputSampleSeconds ≤ 60). Failures report key paths only.
    - **Dependencies:** 1.3.1.
    - **Completion Check:** `Kafka3OOptionsValidatorTests` cover each boundary (for example MaxBytes 10,000,000 passes, 10,000,001 fails; MaxTimeMs 25,000/25,001; RetentionDays 0/1/3650/3651; hash at 209,999 iterations fails) and assert a sentinel secret never appears in failure messages.
  - [ ] 1.3.3 Fail startup with a sanitized message
    - **Source:** TECH §14.3 ("fails before readiness on any violation, logging the key name but never a value").
    - **Files:** Proposed `src/Kafka3O.UI.Server/Program.cs` (modify).
    - **Symbols:** Top-level startup; catch `OptionsValidationException`.
    - **Implementation:** Build the host, force options validation before `app.Run`, log each failing key path through the console logger at Critical, and return a non-zero exit code. Never log option values or secret contents.
    - **Dependencies:** 1.3.2.
    - **Completion Check:** Phase 1 steps 8-10; API test `Startup_InvalidConfiguration_ExitsNonZero` via a host builder.
  - [ ] 1.3.4 Non-secret defaults and the sanitized example
    - **Source:** TECH §5.4 (`appsettings.json` non-secret defaults; `config/` sanitized examples), §14.3 example values, §16.1.
    - **Files:** Proposed `src/Kafka3O.UI.Server/appsettings.json` (create), `config/appsettings.example.json` (create).
    - **Symbols:** Kestrel endpoint `http://0.0.0.0:8080`; logging defaults; example `Kafka3O` section with every key, placeholder paths, environments `dev`/`staging`, gateways `local`/`offline`, and baseline bounds (`Limit` 100/1,000, `MaxScan` 10,000/10,000, `MaxMatches` 100/1,000, `MaxBytes` 10,000,000/10,000,000, `MaxTimeMs` 10,000/10,000, `ThroughputSampleSeconds` 5/60).
    - **Implementation:** No secret values anywhere; the example validates when its placeholder files exist.
    - **Dependencies:** 1.3.2.
    - **Completion Check:** Test `ExampleConfiguration_ValidatesWithPlaceholderFiles` binds the example with generated placeholder files and passes validation.
  - [ ] 1.3.5 Document local setup
    - **Source:** TECH §5.4; plan section "Local Manual Test Environment".
    - **Files:** Proposed `config/README.md` (create).
    - **Symbols:** Sections: prerequisites, emergency hash, Data Protection certificate (`openssl req -x509 -newkey rsa:3072 -nodes ...`), Gateway TLS certificate and keys, PostgreSQL connection file, `appsettings.Development.json`.
    - **Implementation:** Commands use placeholders; secrets stay in `config/local/`.
    - **Dependencies:** 1.3.4, 1.2.2.
    - **Completion Check:** Phase 1 step 4 completes by following only this document.

### Task 1.4: Client shell, visual system, and sign-in route

- **Status:** Not Started
- **Source:** DES §3.1, §4, §8, §14.1, §14.2, TECH §14.7
- **Outcome:** The Blazor client renders the approved shell and visual tokens, with self-hosted fonts and icons, a `/signin` page, a root redirect, and a not-found view, all CSP-compatible.
- **Dependencies:** Task 1.1
- **Affected Files:** Proposed `src/Kafka3O.UI.Client/Program.cs`, `App.razor`, `_Imports.razor`, `wwwroot/index.html`, `wwwroot/css/app.css`, `wwwroot/fonts/*`, `wwwroot/icons/*`, `Layout/ApplicationShell.razor`, `Layout/PublicLayout.razor`, `Features/Identity/SignInPage.razor`, `Features/Shared/NotFoundPage.razor`
- **Manual Test Mapping:** Phase 1 step 7.
- **Subtasks:**
  - [ ] 1.4.1 Bootstrap the client without inline markup
    - **Source:** TECH §14.7 (no inline scripts, handlers or styles, including the `index.html` error UI); DES §14.2.
    - **Files:** Proposed `src/Kafka3O.UI.Client/Program.cs`, `App.razor`, `_Imports.razor`, `wwwroot/index.html` (create).
    - **Symbols:** `Router` with `NotFound` rendering `NotFoundPage` inside the shell; `#blazor-error-ui` styled by class.
    - **Implementation:** Only external script `_framework/blazor.webassembly.js`; no `style` attributes.
    - **Dependencies:** 1.1.2.
    - **Completion Check:** Browser test `Shell_NoCspViolations` (Task 1.6.3) reports zero violations.
  - [ ] 1.4.2 Visual tokens, fonts, and icons
    - **Source:** DES §4.1 tokens and type scale, §4.2 spacing, §8.2 contrast/focus/forced colors, §14.2.
    - **Files:** Proposed `src/Kafka3O.UI.Client/wwwroot/css/app.css`, `wwwroot/fonts/` (Source Sans 3 and IBM Plex Mono WOFF2 with OFL license files), `wwwroot/icons/` (needed Lucide SVGs with ISC license) (create).
    - **Symbols:** CSS custom properties for each DES §4.1 token; `@font-face` rules; `prefers-reduced-motion` and `forced-colors` rules.
    - **Implementation:** 14px body / 16px form / 24px titles in rem; 4px spacing scale; 40px rows/controls; 44px targets on coarse pointers; no third-party requests.
    - **Dependencies:** 1.4.1.
    - **Completion Check:** Phase 1 step 7 (Source Sans 3 rendered); network panel shows no third-party requests.
  - [ ] 1.4.3 Application shell and public layout
    - **Source:** DES §3.1 (56px header, 224px navigation, breadcrumbs), §8.1 responsive rules, §8.2 landmarks and skip link.
    - **Files:** Proposed `src/Kafka3O.UI.Client/Layout/ApplicationShell.razor`, `Layout/PublicLayout.razor` (create).
    - **Symbols:** `ApplicationShell` (header, navigation slot, main with skip link target, breadcrumb slot); `PublicLayout` for sign-in pages.
    - **Implementation:** Navigation drawer below 768px; collapsible rail 768-1199px; sticky header never covers focused controls. Navigation items appear from Phase 3 permissions.
    - **Dependencies:** 1.4.2.
    - **Completion Check:** bUnit `ApplicationShellTests` assert header/nav/main landmarks and a skip link targeting main.
  - [ ] 1.4.4 Sign-in route, root redirect, and not-found view
    - **Source:** DES §14.1 (root, P01 `/signin`, unknown paths render not-found without API calls).
    - **Files:** Proposed `src/Kafka3O.UI.Client/Features/Identity/SignInPage.razor`, `Features/Shared/NotFoundPage.razor` (create).
    - **Symbols:** `@page "/signin"`; root `/` redirects to `/signin` (Phase 3 adds the session check).
    - **Implementation:** `SignInPage` shows the "Kafka3O-UI" heading; sign-in options arrive in Phase 3. `NotFoundPage` makes no API call.
    - **Dependencies:** 1.4.3.
    - **Completion Check:** Phase 1 step 7; bUnit `NotFoundPageTests` assert no HTTP call.

### Task 1.5: Web host pipeline

- **Status:** Not Started
- **Source:** TECH §14.7, §14.9, §14.3 (ports, trusted proxies), ADD §3.1, §3.4, §5 (Health, request limits)
- **Outcome:** The server listens on 8080, applies trusted-proxy rules, security headers on every response, public health probes, the error envelope with request IDs, JSON 404 for unknown API paths, and the SPA fallback exclusions.
- **Dependencies:** Task 1.3
- **Affected Files:** Proposed `src/Kafka3O.UI.Server/Program.cs`, `Infrastructure/Hosting/SecurityHeadersMiddleware.cs`, `Infrastructure/Hosting/HealthEndpoints.cs`, `Infrastructure/Hosting/ReadinessState.cs`, `Infrastructure/Hosting/RequestIdMiddleware.cs`, `Infrastructure/Hosting/ApiErrors.cs`, `Infrastructure/Hosting/JsonDefaults.cs`, `src/Kafka3O.UI.Contracts/Features/Common/ErrorEnvelope.cs`, `ResultEnvelope.cs`, `Page.cs`
- **Manual Test Mapping:** Phase 1 steps 4-7.
- **Subtasks:**
  - [ ] 1.5.1 Listener, request limits, and trusted proxies
    - **Source:** TECH §14.3 (fixed port 8080, `Network:*`), §7.2 (trust forwarded addresses only from configured proxies), ADD §5 (headers 32,768 bytes, URL 8,192 bytes).
    - **Files:** Proposed `src/Kafka3O.UI.Server/Program.cs` (modify).
    - **Symbols:** `KestrelServerLimits.MaxRequestHeadersTotalSize`=32768, `MaxRequestLineSize`=8192; `ForwardedHeadersOptions` (`XForwardedFor | XForwardedProto`, `KnownProxies`/`KnownNetworks` from options, defaults cleared).
    - **Implementation:** `UseForwardedHeaders` runs first; untrusted senders' forwarded headers are ignored.
    - **Dependencies:** 1.3.3.
    - **Completion Check:** `ForwardedHeadersTests`: header from an untrusted address leaves `RemoteIpAddress` unchanged; from a trusted proxy it is applied; oversized URL returns 414.
  - [ ] 1.5.2 Security headers on every response
    - **Source:** TECH §14.7 table; FUNC §3.10 F8; V9.
    - **Files:** Proposed `src/Kafka3O.UI.Server/Infrastructure/Hosting/SecurityHeadersMiddleware.cs` (create).
    - **Symbols:** `SecurityHeadersMiddleware.InvokeAsync(HttpContext)`.
    - **Implementation:** Register before all other middleware; set headers in `Response.OnStarting` so errors, redirects, static files and health responses carry the exact values. No per-route relaxation.
    - **Dependencies:** 1.5.1.
    - **Completion Check:** `SecurityHeadersTests` assert exact values on a static file, `/health/live`, a JSON 404, a 500, and a redirect.
  - [ ] 1.5.3 Health probes and readiness contributors
    - **Source:** ADD §5 Health; TECH §8.6; ADD §3.2 (bodyless probes never renew sessions).
    - **Files:** Proposed `src/Kafka3O.UI.Server/Infrastructure/Hosting/HealthEndpoints.cs` (create), `ReadinessState.cs` (create).
    - **Symbols:** `GET /health/live` -> 200 `{status:"live"}`; `GET /health/ready` -> 200 `{status:"ready"}` or 503 `{status:"not_ready"}`; `IReadinessCheck.CheckAsync(CancellationToken) -> bool`; `ReadinessState.MarkShuttingDown()`.
    - **Implementation:** Ready only when all registered checks pass and not shutting down; no dependency names or errors in bodies; `Cache-Control: no-store`. Phase 1 registers no checks; Phase 2 adds database, schema, key ring and recovery checks.
    - **Dependencies:** 1.5.2.
    - **Completion Check:** `HealthEndpointTests`: live 200; ready 200 with no checks; ready 503 with a failing fake check and body `{"status":"not_ready"}` only.
  - [ ] 1.5.4 Error envelope, result envelope, and request IDs
    - **Source:** ADD §3.1, §3.4, TECH §10.1, §11.3, §14.5, §14.2.
    - **Files:** Proposed `src/Kafka3O.UI.Contracts/Features/Common/ErrorEnvelope.cs`, `ResultEnvelope.cs`, `Page.cs` (create); `src/Kafka3O.UI.Server/Infrastructure/Hosting/ApiErrors.cs`, `RequestIdMiddleware.cs`, `JsonDefaults.cs` (create).
    - **Symbols:** `ErrorEnvelope(string Code, string Message, int Status, string RequestId, IReadOnlyList<FieldError>? FieldErrors, string? UpstreamCode, ErrorOutcome Outcome)`; `ErrorOutcome` = `not_started|failed|unknown`; `FieldError(Path, Code, Message)`; `ResultEnvelope<T>(T Data, ResultMeta Meta)`; `ResultMeta(RequestId, AuditStatus)`; `AuditStatus` = `recorded|recording_failed|not_required`; `Page<T>(Items, PageInfo{Number, Size, Total: string})`; `ApiErrors` static factory for every ADD §3.4 code plus `UPSTREAM_OPERATION_UNAVAILABLE`.
    - **Implementation:** Server-generated UUID request ID per API request, returned in the envelope and `X-Request-Id`; JSON camelCase; request deserialization rejects unknown members; `fieldErrors` capped at 100, messages at 1,024 UTF-8 bytes, never echoing submitted values; unhandled exceptions -> 500 `INTERNAL_ERROR` without stack traces. No `progress` field (TECH §14.5).
    - **Dependencies:** 1.5.1.
    - **Completion Check:** `ErrorEnvelopeTests`: serialized shape has exactly the seven fields; 500 body contains no exception text; `fieldErrors` truncated at 100.
  - [ ] 1.5.5 API 404 and the SPA fallback
    - **Source:** TECH §14.9; ADD §11.1 (unregistered API requests -> 404 `NOT_FOUND`).
    - **Files:** Proposed `src/Kafka3O.UI.Server/Program.cs` (modify).
    - **Symbols:** Fallback for `/api/{**path}` -> 404 `NOT_FOUND` envelope; `MapFallbackToFile("index.html")` for GET paths not under `/api/`, `/signin-oidc/`, `/health/`; static Client assets.
    - **Implementation:** Non-GET unknown paths return 404 without HTML; `/signin-oidc/*` without a registered handler returns 404.
    - **Dependencies:** 1.5.4, 1.4.1.
    - **Completion Check:** `ApiFallbackTests`: `/api/v1/x` JSON 404; `/signin-oidc/x` 404 not HTML; `/health/x` 404; `/clusters/abc` returns `index.html`.

### Task 1.6: Test projects, coverage, scripts, and the PR workflow

- **Status:** Not Started
- **Source:** TECH §4.1, §4.2, §4.4, §5.3, §5.4, §3.6
- **Outcome:** Test projects exist with pinned tooling; host, boundary, component and browser smoke tests run; coverage floors and scripts are in place; GitHub Actions runs the PR gate.
- **Dependencies:** Tasks 1.4, 1.5
- **Affected Files:** Proposed `tests/Kafka3O.UI.Server.Tests/`, `tests/Kafka3O.UI.Client.Tests/`, `tests/Kafka3O.UI.Browser.Tests/`, `tests/Kafka3O.UI.TestSupport/` (projects), `coverage.runsettings`, `scripts/build.ps1`, `scripts/test.ps1`, `.github/workflows/pr.yml`
- **Manual Test Mapping:** Supports Phase 1 steps 2 and 5-7 through automated equivalents.
- **Subtasks:**
  - [ ] 1.6.1 Create test projects and pin test tooling
    - **Source:** TECH §4.1 (xUnit v3, `WebApplicationFactory`, bUnit, Playwright for .NET, Coverlet with VSTest adapter; validate together on SDK 10.0.401), §5.3.
    - **Files:** Proposed `tests/Kafka3O.UI.Server.Tests/Kafka3O.UI.Server.Tests.csproj`, `tests/Kafka3O.UI.Client.Tests/Kafka3O.UI.Client.Tests.csproj`, `tests/Kafka3O.UI.Browser.Tests/Kafka3O.UI.Browser.Tests.csproj`, `tests/Kafka3O.UI.TestSupport/Kafka3O.UI.TestSupport.csproj`, `tests/Kafka3O.UI.TestSupport/TestConfiguration.cs` (create); `Directory.Packages.props` (modify).
    - **Symbols:** `TestConfiguration.CreateValid(string root) -> IDictionary<string,string?>` writing placeholder secret, certificate and hash files.
    - **Implementation:** Pin exact versions after validating discovery, execution and coverage collection together; record versions in `Directory.Packages.props`. Add `Microsoft.Extensions.TimeProvider.Testing` 10.0.x for `FakeTimeProvider`. Production projects never reference TestSupport.
    - **Dependencies:** 1.1.2.
    - **Completion Check:** `dotnet test Kafka3O.UI.slnx --filter "Category!=Browser"` discovers and runs tests on SDK 10.0.401; lockfiles updated.
  - [ ] 1.6.2 Host and dependency-boundary tests
    - **Source:** TECH §3.6, §5.2 (Client never references Server, EF Core, Gateway transport), §14.7, §14.9.
    - **Files:** Proposed `tests/Kafka3O.UI.Server.Tests/Infrastructure/Hosting/SecurityHeadersTests.cs`, `HealthEndpointTests.cs`, `ApiFallbackTests.cs`, `ForwardedHeadersTests.cs`, `ErrorEnvelopeTests.cs`, `tests/Kafka3O.UI.Server.Tests/Architecture/DependencyBoundaryTests.cs` (create).
    - **Symbols:** Test classes named above.
    - **Implementation:** `WebApplicationFactory<Program>` with `TestConfiguration`; boundary test inspects referenced assemblies of Client and Contracts (no `Kafka3O.UI.Server`, `Microsoft.EntityFrameworkCore*`, `Npgsql`) and of production assemblies (no `Kafka3O.UI.TestSupport`).
    - **Dependencies:** 1.6.1, Task 1.5.
    - **Completion Check:** All named tests pass; adding a Client reference to EF Core makes `DependencyBoundaryTests` fail.
  - [ ] 1.6.3 Component and browser smoke tests
    - **Source:** TECH §4.1 (bUnit, Playwright), §14.7 and §14.10 (zero CSP violations), DES §8.2.
    - **Files:** Proposed `tests/Kafka3O.UI.Client.Tests/Layout/ApplicationShellTests.cs`, `tests/Kafka3O.UI.Client.Tests/Features/Shared/NotFoundPageTests.cs`, `tests/Kafka3O.UI.Browser.Tests/Infrastructure/PublishedAppFixture.cs`, `tests/Kafka3O.UI.Browser.Tests/Shell/SignInPageTests.cs` (create).
    - **Symbols:** `PublishedAppFixture` (publishes and starts the server with test configuration on a free port); `Shell_RootRedirectsToSignIn`, `Shell_NoCspViolations`, `Shell_FramingRefused`.
    - **Implementation:** Collect CSP violations from console messages and a `securitypolicyviolation` listener registered through Playwright's init script; assert zero. Framing check loads the app inside an `<iframe>` from a test origin and asserts refusal.
    - **Dependencies:** 1.6.1, Task 1.4.
    - **Completion Check:** Named tests pass in Chromium.
  - [ ] 1.6.4 Coverage configuration and scripts
    - **Source:** TECH §4.2 (90% line / 85% branch for authorization, session, validation, audit orchestration, operation workflows), §5.4 (`scripts/`).
    - **Files:** Proposed `coverage.runsettings`, `scripts/build.ps1`, `scripts/test.ps1` (create).
    - **Symbols:** `scripts/test.ps1 -Suite unit|api|component|persistence|browser|external|all [-Coverage]`.
    - **Implementation:** Coverage includes Server `Features/**` and `Infrastructure/Configuration/**`; excludes migrations and generated code. `-Coverage` fails below the floors. Scripts contain no secrets and select suites by test category so external suites never run by default.
    - **Dependencies:** 1.6.1.
    - **Completion Check:** `pwsh scripts/test.ps1 -Suite unit -Coverage` runs and reports line/branch percentages; a threshold breach exits non-zero.
  - [ ] 1.6.5 GitHub Actions PR workflow
    - **Source:** TECH §4.4 (pull-request suites); plan assumption 1 (GitHub Actions).
    - **Files:** Proposed `.github/workflows/pr.yml` (create).
    - **Symbols:** Jobs `build-test` (restore `--locked-mode`, build, unit/API/component, coverage) and `browser-chromium`.
    - **Implementation:** `ubuntu-latest`, `actions/setup-dotnet` with 10.0.401; third-party actions pinned by commit SHA; no secrets required. Phase 2 adds the persistence job.
    - **Dependencies:** 1.6.4.
    - **Completion Check:** The workflow file passes `actionlint` if available; a pull request shows both jobs green.

---

## Phase 2: Stopped-app maintenance brings a database and key ring to a ready server

- **Phase Status:** Not Started
- **Goal:** An operator initializes the Data Protection key ring, migrates an empty SQLite or PostgreSQL database, and the server becomes ready only against a compatible schema and valid keys while holding the instance locks.
- **Manual Test Plan:**
  1. With no key ring, run `dotnet run --project src/Kafka3O.UI.Server`. Expect a non-zero exit with a log stating the key ring is not initialized, and no key material in the output.
  2. Run `dotnet run --project src/Kafka3O.UI.Server -- maintenance keys initialize --installation-id 6f1c2b8e-0d4a-4c1e-9f7a-3b2d1e0c9a88`. Expect exit 0 and JSON `{"command":"keys initialize","status":"succeeded","installationId":"6f1c2b8e-0d4a-4c1e-9f7a-3b2d1e0c9a88"}`; the key-ring directory contains a key file and `key-manifest.json`.
  3. Run the same command again. Expect exit 3 and an unchanged key-ring directory.
  4. Run `-- maintenance keys verify`. Expect exit 0 and `"status":"succeeded"`.
  5. Start the server. Expect a non-zero exit with a log naming the missing migrations.
  6. Run `-- maintenance database migrate --initial`. Expect exit 0 with `appliedMigrations` listing the initial migration ID.
  7. Start the server and run `curl -s http://localhost:8080/health/ready`. Expect `{"status":"ready"}`.
  8. While the server runs, run `-- maintenance keys verify` in a second terminal. Expect exit 3 with a message about exclusivity.
  9. Stop the server and run `-- maintenance database migrate --initial` again. Expect exit 3 (database not empty) and no schema change.
  10. Switch `Database:Provider` to `PostgreSql` with `config/local/pg.conn`, then repeat steps 6-8. Expect the same results. While the server runs, `psql "$(cat config/local/pg.conn)" -c "select pg_try_advisory_lock(x'4B334F5549000001'::bigint)"` returns `f`.
  11. Stop the server, rename the key-ring directory, and start the server. Expect a non-zero exit with a key-ring error; `-- maintenance keys verify` exits 4. Restore the directory.

### Task 2.1: Persistence model and initial migrations for both providers

- **Status:** Not Started
- **Source:** ADD §4.1 (physical types, constraints, indexes), TECH §8.4, §11.5, §7.4, §2.4, §13.1 (49-literal CHECK)
- **Outcome:** One EF Core model with provider-specific contexts and a reviewed initial migration per provider creating all six v1 tables.
- **Dependencies:** Phase 1
- **Affected Files:** Proposed `src/Kafka3O.UI.Server/Infrastructure/Persistence/Kafka3ODbContext.cs`, `SqliteKafka3ODbContext.cs`, `PostgreSqlKafka3ODbContext.cs`, `DesignTimeFactories.cs`, `Records.cs`, `SqliteForeignKeyInterceptor.cs`, `ExpectedMigrations.cs`, `Configurations/*.cs`, `Migrations/Sqlite/*`, `Migrations/PostgreSql/*`, `PersistenceServiceCollectionExtensions.cs`; `.config/dotnet-tools.json`; `tests/Kafka3O.UI.Persistence.Tests/*`
- **Manual Test Mapping:** Phase 2 steps 5-7, 9-10.
- **Subtasks:**
  - [ ] 2.1.1 Entities and provider contexts
    - **Source:** ADD §4.1 table (Sessions, Roles, RolePermissions, Assignments, LoginThrottle, AuditEvents); TECH §11.5 conventions.
    - **Files:** Proposed `src/Kafka3O.UI.Server/Infrastructure/Persistence/Kafka3ODbContext.cs`, `SqliteKafka3ODbContext.cs`, `PostgreSqlKafka3ODbContext.cs`, `Records.cs` (create).
    - **Symbols:** `SessionRecord`, `RoleRecord`, `RolePermissionRecord`, `AssignmentRecord`, `LoginThrottleRecord`, `AuditEventRecord`; abstract `Kafka3ODbContext` with `DbSet`s used only inside `Infrastructure/Persistence`.
    - **Implementation:** Timestamps as epoch-millisecond `long`; UUIDs native in PostgreSQL and canonical lowercase 36-character text in SQLite (value converter validating shape); booleans as SQLite integer; session hash `byte[32]`. No password, token or message fields.
    - **Dependencies:** Phase 1.
    - **Completion Check:** Model builds for both contexts; `ModelShapeTests` assert column types per provider.
  - [ ] 2.1.2 Constraints, indexes, and collation
    - **Source:** ADD §4.1 (NOT NULL defaults, octet-length CHECKs, enum CHECKs, `text COLLATE "C"` / `TEXT COLLATE BINARY`, indexes, RESTRICT FKs, filtered unique RESULT `attemptId`, session CHECKs, 49-literal permission CHECK excluding `gateway.m8`), TECH §8.2 as amended.
    - **Files:** Proposed `src/Kafka3O.UI.Server/Infrastructure/Persistence/Configurations/SessionConfiguration.cs`, `RoleConfiguration.cs`, `RolePermissionConfiguration.cs`, `AssignmentConfiguration.cs`, `LoginThrottleConfiguration.cs`, `AuditEventConfiguration.cs` (create).
    - **Symbols:** `IEntityTypeConfiguration<T>` per record.
    - **Implementation:** Provider-specific CHECK SQL where syntax differs (`octet_length` vs `length(CAST(x AS BLOB))`); the permission CHECK lists exactly the 49 v1 literals; `absoluteExpiresAt = createdAt + 28800000`; emergency/SSO session shape rules; `Assignments.duplicateKey` unique; no audit FKs or cascades.
    - **Dependencies:** 2.1.1.
    - **Completion Check:** `SchemaConstraintTests` (Task 2.1.4) reject each invalid row on both providers.
  - [ ] 2.1.3 Generate and review provider migrations
    - **Source:** TECH §7.4 (provider-specific migrations run explicitly), ADD §6.
    - **Files:** Proposed `.config/dotnet-tools.json` (create, pinned `dotnet-ef` 10.0.12), `src/Kafka3O.UI.Server/Infrastructure/Persistence/DesignTimeFactories.cs`, `ExpectedMigrations.cs`, `Migrations/Sqlite/<timestamp>_InitialSchema.cs`, `Migrations/PostgreSql/<timestamp>_InitialSchema.cs` (create).
    - **Symbols:** `SqliteDesignTimeFactory`, `PostgreSqlDesignTimeFactory` (`IDesignTimeDbContextFactory`); `ExpectedMigrations.Sqlite`, `ExpectedMigrations.PostgreSql` (ordered migration IDs).
    - **Implementation:** Generate with `dotnet ef migrations add InitialSchema --context SqliteKafka3ODbContext --output-dir Infrastructure/Persistence/Migrations/Sqlite` and the PostgreSQL equivalent; review generated SQL against ADD §4.1; design-time factories read no production secrets.
    - **Dependencies:** 2.1.2.
    - **Completion Check:** `dotnet ef migrations script --context <each>` produces DDL containing every CHECK and index; `ExpectedMigrations` equals the generated IDs.
  - [ ] 2.1.4 Provider registration and persistence test fixture
    - **Source:** TECH §2.4 (provider chosen at startup), §4.1 (temporary SQLite, Testcontainers PostgreSQL), plan assumption 4; ADD §4.1 (SQLite FK enforcement on every connection).
    - **Files:** Proposed `src/Kafka3O.UI.Server/Infrastructure/Persistence/PersistenceServiceCollectionExtensions.cs`, `SqliteForeignKeyInterceptor.cs` (create); `tests/Kafka3O.UI.Persistence.Tests/Kafka3O.UI.Persistence.Tests.csproj`, `ProviderFixture.cs`, `SchemaConstraintTests.cs` (create); `Directory.Packages.props` (modify: EF Core, Sqlite, SQLitePCLRaw bundle 3.0.5, SQLite 3.53.4, Npgsql 10.0.3, Testcontainers.PostgreSql).
    - **Symbols:** `AddKafka3OPersistence(IServiceCollection, Kafka3OOptions)`; `ProviderFixture` exposing `Sqlite` and `PostgreSql` (skip reason when unavailable).
    - **Implementation:** Connection string read through `SecretFileReader`; no automatic migration; SQLite `PRAGMA foreign_keys=ON` per connection. Fixture uses Testcontainers `postgres:18.6` or `KAFKA3O_TEST_POSTGRES_CONNECTION`; missing both marks PostgreSQL cases skipped with reason "not verified".
    - **Dependencies:** 2.1.3.
    - **Completion Check:** `pwsh scripts/test.ps1 -Suite persistence` runs SQLite cases and PostgreSQL cases (or reports them skipped/not verified); `SchemaConstraintTests` reject a `gateway.m8` RolePermission, duplicate normalized role name, second RESULT for an attempt, and invalid UUID text in SQLite.

### Task 2.2: Instance and maintenance exclusivity

- **Status:** Not Started
- **Source:** TECH §14.6, §13.1 (single replica), ADD §6
- **Outcome:** The server and every maintenance command take the instance file lock and, for PostgreSQL, the advisory lock; loss of the advisory connection takes the server out of readiness and exits.
- **Dependencies:** Task 2.1
- **Affected Files:** Proposed `src/Kafka3O.UI.Server/Infrastructure/Hosting/InstanceLock.cs`, `Infrastructure/Hosting/PostgreSqlAdvisoryLock.cs`, `Infrastructure/Hosting/InstanceLockHostedService.cs`, `tests/Kafka3O.UI.Persistence.Tests/InstanceLockTests.cs`
- **Manual Test Mapping:** Phase 2 steps 8 and 10.
- **Subtasks:**
  - [ ] 2.2.1 Instance file lock
    - **Source:** TECH §14.6 bullet 1.
    - **Files:** Proposed `src/Kafka3O.UI.Server/Infrastructure/Hosting/InstanceLock.cs` (create).
    - **Symbols:** `InstanceLock.TryAcquire(string statePath) -> InstanceLock?` (`IDisposable`).
    - **Implementation:** Open `{StatePath}/instance.lock` with `FileShare.None`, non-blocking; hold for the process lifetime; `null` when held elsewhere.
    - **Dependencies:** 2.1.4.
    - **Completion Check:** `InstanceLockTests.SecondAcquire_ReturnsNull`.
  - [ ] 2.2.2 PostgreSQL advisory lock with connection monitoring
    - **Source:** TECH §14.6 bullet 1 (dedicated connection outside the EF pool; loss -> not ready, drain, exit).
    - **Files:** Proposed `src/Kafka3O.UI.Server/Infrastructure/Hosting/PostgreSqlAdvisoryLock.cs` (create).
    - **Symbols:** `PostgreSqlAdvisoryLock.TryAcquireAsync(string connectionString, CancellationToken) -> PostgreSqlAdvisoryLock?`; `LockKey = 0x4B334F5549000001L`; event `ConnectionLost`.
    - **Implementation:** Dedicated `NpgsqlConnection` with `Pooling=false`; `SELECT pg_try_advisory_lock(@key)`; a 5-second keep-alive query detects loss (interval is implementation guidance) and raises `ConnectionLost`.
    - **Dependencies:** 2.1.4.
    - **Completion Check:** `InstanceLockTests.AdvisoryLock_SecondSession_Fails` and `AdvisoryLock_ConnectionTerminated_RaisesLost` (terminate the backend with `pg_terminate_backend`) on PostgreSQL.
  - [ ] 2.2.3 Wire the locks into the server and maintenance
    - **Source:** TECH §14.6 bullets 1-2; ADD §6 (exit 3 when exclusivity fails); TECH §8.6 (drain).
    - **Files:** Proposed `src/Kafka3O.UI.Server/Infrastructure/Hosting/InstanceLockHostedService.cs` (create); `src/Kafka3O.UI.Server/Infrastructure/Maintenance/MaintenanceHost.cs` (modify).
    - **Symbols:** `InstanceLockHostedService.StartAsync` (runs before readiness checks pass); `MaintenanceHost.AcquireExclusivityAsync() -> bool`.
    - **Implementation:** Server: acquire file lock then (PostgreSQL) advisory lock; failure logs a sanitized error and stops the host with a non-zero exit. On `ConnectionLost`: `ReadinessState.MarkShuttingDown()`, stop admitting work, trigger application stop (drain handled by Phase 20 shutdown logic; until then immediate stop). Maintenance commands (except `emergency hash-password`) acquire both non-blocking; failure exits 3.
    - **Dependencies:** 2.2.1, 2.2.2, 1.2.1.
    - **Completion Check:** Phase 2 steps 8 and 10; `MaintenanceExclusivityTests.KeysVerify_WhileLockHeld_Exits3`.

### Task 2.3: Data Protection key ring commands and startup gate

- **Status:** Not Started
- **Source:** TECH §7.3, §9.5, ADD §6 (`keys initialize`, `keys verify`), ADD §5 Startup
- **Outcome:** Keys are created only by an explicit first-install command, verified read-only, and required at startup; the server never regenerates a lost ring.
- **Dependencies:** Task 2.2
- **Affected Files:** Proposed `src/Kafka3O.UI.Server/Infrastructure/Configuration/DataProtectionSetup.cs`, `Infrastructure/Maintenance/KeyManifest.cs`, `Infrastructure/Maintenance/KeysInitializeCommand.cs`, `Infrastructure/Maintenance/KeysVerifyCommand.cs`, `Infrastructure/Hosting/KeyRingReadinessCheck.cs`, `tests/Kafka3O.UI.Server.Tests/Infrastructure/Maintenance/KeyCommandTests.cs`
- **Manual Test Mapping:** Phase 2 steps 1-4, 11.
- **Subtasks:**
  - [ ] 2.3.1 Configure Data Protection on the protected key ring
    - **Source:** TECH §7.3 (encrypted with secret-provisioned certificate; missing keys prevent startup), §9.5 (first certificate encrypts; all decrypt), §14.3 `DataProtection:*`.
    - **Files:** Proposed `src/Kafka3O.UI.Server/Infrastructure/Configuration/DataProtectionSetup.cs` (create).
    - **Symbols:** `AddKafka3ODataProtection(IServiceCollection, Kafka3OOptions)`.
    - **Implementation:** `SetApplicationName("Kafka3O-UI")`, `PersistKeysToFileSystem(KeyRingPath)`, `ProtectKeysWithCertificate(first)`, `UnprotectKeysWithAnyCertificate(all)`. Normal key rolling inside an existing ring stays enabled so new keys are encrypted with the first (current) certificate (TECH §9.5); creating a ring from nothing is prevented by the startup gate in 2.3.3, never by the framework at runtime.
    - **Dependencies:** 1.3.2.
    - **Completion Check:** `DataProtectionSetupTests.RolledKey_EncryptedWithFirstCertificate`; with `Certificates` = [new, old] a key written under the old certificate still decrypts.
  - [ ] 2.3.2 `maintenance keys initialize`
    - **Source:** ADD §6 row (first install only, empty key directory, no prior manifest, never overwrite; atomic manifest with installation ID, key IDs, certificate thumbprints; decrypt round-trip).
    - **Files:** Proposed `src/Kafka3O.UI.Server/Infrastructure/Maintenance/KeysInitializeCommand.cs`, `KeyManifest.cs` (create).
    - **Symbols:** `KeysInitializeCommand.RunAsync(Guid installationId) -> int`; `KeyManifest(Guid InstallationId, IReadOnlyList<Guid> KeyIds, IReadOnlyList<string> CertificateThumbprints, string CreatedAt)`.
    - **Implementation:** Require exclusivity (2.2.3); refuse (exit 3) if the directory is non-empty or a manifest exists; create one key via `IKeyManager.CreateNewKey`; protect/unprotect a probe payload; write `key-manifest.json` to a temp file then atomic rename; restrict file mode to owner on Unix; print sanitized JSON.
    - **Dependencies:** 2.3.1, 2.2.3.
    - **Completion Check:** `KeyCommandTests.Initialize_EmptyDirectory_Succeeds`, `Initialize_Twice_Exits3_Unchanged`, `Initialize_OutputContainsNoKeyMaterial`.
  - [ ] 2.3.3 `maintenance keys verify` and the key-ring startup check
    - **Source:** ADD §6 `keys verify` (read-only; exit 0 or nonzero); ADD §5 Startup (installed key manifest before readiness; no regeneration).
    - **Files:** Proposed `src/Kafka3O.UI.Server/Infrastructure/Maintenance/KeysVerifyCommand.cs`, `Infrastructure/Hosting/KeyRingReadinessCheck.cs` (create).
    - **Symbols:** `KeysVerifyCommand.RunAsync() -> int` (`{command,status,installationId}`); `KeyRingReadinessCheck : IReadinessCheck`; `KeyRingVerifier.Verify(KeyManifest) -> KeyRingStatus`.
    - **Implementation:** Check manifest presence, every listed key readable, certificate private-key access, ownership/mode on Unix, and decrypt a probe. Startup runs the same verifier and exits non-zero on failure.
    - **Dependencies:** 2.3.2.
    - **Completion Check:** `KeyCommandTests.Verify_MissingKey_Exits4`, `Verify_Valid_Exits0`; `StartupGateTests.MissingKeyRing_ExitsNonZero`.

### Task 2.4: Database migrate command and schema startup gate

- **Status:** Not Started
- **Source:** ADD §6 (`database migrate`), TECH §16.3 (S3), §14.11 (backup manifest), §7.4, §8.6, ADD §5 Startup
- **Outcome:** Operators migrate forward only through the maintenance command; the server refuses to start against an unmigrated or unknown schema.
- **Dependencies:** Task 2.3
- **Affected Files:** Proposed `src/Kafka3O.UI.Server/Infrastructure/Maintenance/DatabaseMigrateCommand.cs`, `Infrastructure/Maintenance/BackupManifest.cs`, `Infrastructure/Hosting/StartupGate.cs`, `Infrastructure/Hosting/DatabaseReadinessCheck.cs`, `tests/Kafka3O.UI.Persistence.Tests/MigrateCommandTests.cs`, `tests/Kafka3O.UI.Server.Tests/Infrastructure/Maintenance/BackupManifestTests.cs`
- **Manual Test Mapping:** Phase 2 steps 5-7, 9-10.
- **Subtasks:**
  - [ ] 2.4.1 Backup manifest model and strict validation
    - **Source:** TECH §14.11 backup manifest table.
    - **Files:** Proposed `src/Kafka3O.UI.Server/Infrastructure/Maintenance/BackupManifest.cs` (create).
    - **Symbols:** `BackupManifest(int SchemaVersion, Guid InstallationId, string CreatedAt, string Provider, IReadOnlyList<string> AppliedMigrations, FileDigest DatabaseBackup, FileDigest KeyRingBackup)`; `BackupManifestValidator.Validate(path, KeyManifest, options, appliedHistory) -> ValidationOutcome`.
    - **Implementation:** Deserialize with unknown members disallowed (exit 2 on shape errors); paths relative to the manifest directory and must not escape it; SHA-256 lowercase hex must match; installation ID, provider and applied-migration history must match (exit 4).
    - **Dependencies:** 2.3.2.
    - **Completion Check:** `BackupManifestTests` for unknown field (2), hash mismatch (4), path traversal `../x` (2), provider mismatch (4).
  - [ ] 2.4.2 `maintenance database migrate`
    - **Source:** ADD §6 row (stopped app, explicit provider migrations, forward only, schema validation, stay stopped on failure); TECH §16.3.
    - **Files:** Proposed `src/Kafka3O.UI.Server/Infrastructure/Maintenance/DatabaseMigrateCommand.cs` (create).
    - **Symbols:** `DatabaseMigrateCommand.RunAsync(bool initial, string? backupManifestPath) -> int`.
    - **Implementation:** Require exclusivity; exactly one of `--initial` or `--backup-manifest` (else exit 2). `--initial` requires empty migration history and no application tables (else exit 3). Apply the configured provider's migrations with `MigrateAsync`, then compare history with `ExpectedMigrations`; never down-migrate; output `{command,status,appliedMigrations}`. Failures exit 4/5 and leave the application stopped.
    - **Dependencies:** 2.4.1, 2.1.3.
    - **Completion Check:** `MigrateCommandTests` (both providers): initial on empty succeeds; initial on migrated exits 3; neither option exits 2.
  - [ ] 2.4.3 Startup gate and readiness checks
    - **Source:** ADD §5 Startup (DB connectivity, exact migration set, key manifest, recovery marker, protected-volume permissions; no automatic migrations); TECH §7.4.
    - **Files:** Proposed `src/Kafka3O.UI.Server/Infrastructure/Hosting/StartupGate.cs`, `DatabaseReadinessCheck.cs` (create); `src/Kafka3O.UI.Server/Program.cs` (modify).
    - **Symbols:** `StartupGate.RunAsync(CancellationToken) -> StartupGateResult`; `DatabaseReadinessCheck : IReadinessCheck`; recovery marker path `{StatePath}/recovery-pending.json`.
    - **Implementation:** Order: configuration, instance locks, key ring, database connectivity, applied migrations equal `ExpectedMigrations` (pending or unknown -> refuse), recovery marker absent (Phase 21 creates it), `KeyRingPath` and `StatePath` not writable by others on Unix. Any failure logs a sanitized reason and exits non-zero. Readiness re-checks database reachability.
    - **Dependencies:** 2.4.2, 2.3.3, 2.2.3.
    - **Completion Check:** Phase 2 steps 5, 7, 11; `StartupGateTests.PendingMigration_Refused`, `RecoveryMarkerPresent_Refused`, `AllChecksPass_Ready`.

### Task 2.5: Persistence job in the PR workflow

- **Status:** Not Started
- **Source:** TECH §4.4 (SQLite/PostgreSQL integration on pull requests), §4.4 bullets (container absence is not a pass)
- **Outcome:** CI runs the persistence suite against SQLite and Testcontainers PostgreSQL.
- **Dependencies:** Task 2.4
- **Affected Files:** Proposed `.github/workflows/pr.yml` (modify)
- **Manual Test Mapping:** Not manually exercised; supports Phase 2 automated verification.
- **Subtasks:**
  - [ ] 2.5.1 Add the persistence job
    - **Source:** TECH §4.4 pull-request row.
    - **Files:** Proposed `.github/workflows/pr.yml` (modify).
    - **Symbols:** Job `persistence`.
    - **Implementation:** Runs `pwsh scripts/test.ps1 -Suite persistence` on `ubuntu-latest` (Docker available); fails if PostgreSQL cases report skipped in CI.
    - **Dependencies:** 2.1.4.
    - **Completion Check:** A pull request shows the `persistence` job green with zero skipped PostgreSQL cases.

---

## Phase 3: Emergency sign-in, sessions, and the authorized cluster directory

- **Phase Status:** Not Started
- **Goal:** A user signs in with the emergency account (with persistent throttling), sees the configured clusters grouped by environment, keeps a server-side session with the approved expiry rules, and signs out.
- **Manual Test Plan:**
  1. Open `http://localhost:8080`. Expect `/signin` with an "Emergency sign in" link and no SSO buttons (no `Oidc` section configured).
  2. On the emergency page, submit a wrong password five times. Expect a generic "Sign-in failed" message each time and the password field cleared. Submit a sixth wrong password immediately. Expect a message asking to retry after about 1 second, derived from the server response.
  3. Wait 2 seconds and submit `Correct-Horse-1`. Expect navigation to `/clusters` showing environment `dev` with cluster `local` and environment `staging` with cluster `offline`, and a header identity indicator "Emergency access".
  4. In DevTools > Application, inspect cookies. Expect `__Host-Kafka3O.Session` with HttpOnly, Secure, SameSite=Lax, Path `/`, no Domain. Expect Local Storage and Session Storage to contain no session or antiforgery tokens.
  5. Run `curl -i -X POST -b "__Host-Kafka3O.Session=$S" http://localhost:8080/api/v1/session/logout`. Expect `403` with `"code":"CSRF_INVALID"`, and the browser session still works on refresh.
  6. Run `curl -s -b "__Host-Kafka3O.Session=$S" http://localhost:8080/api/v1/session`. Expect JSON with `data.principal.authSource` `emergency` and `data.applicationPermissionIds` containing `app.access.manage`, `app.audit.view`, `gateway.lock.override`.
  7. Click "Sign out". Expect `/signin`. Repeat the step 6 curl. Expect `401` with `"code":"SESSION_EXPIRED"`.
  8. Sign in again, change `Emergency:CredentialVersion`, and restart the server. Refresh the browser. Expect redirection to `/signin`.
  9. In PostgreSQL mode, stop access to the database (for example revoke the connection or stop the instance) and try to sign in. Expect a "service unavailable" message, no session cookie set. Restore access.

### Task 3.1: Audit recording core

- **Status:** Not Started
- **Source:** TECH §7.4 table, §9.2, §10.1, §14.4, ADD §2.1 audit profiles, ADD §3.3 `AuditEventView`, ADD §4.1 AuditEvents
- **Outcome:** Features record durable audit events, attempts and results with the fixed vocabulary and allowlisted targets; required pre-action failures stop the action.
- **Dependencies:** Phase 2
- **Affected Files:** Proposed `src/Kafka3O.UI.Server/Features/Audit/AuditOperation.cs`, `AuditTarget.cs`, `AuditModels.cs`, `IAuditWriter.cs`, `AuditUnavailableException.cs`, `src/Kafka3O.UI.Server/Infrastructure/Persistence/AuditStore.cs`, `tests/Kafka3O.UI.Server.Tests/Features/Audit/AuditTargetTests.cs`, `tests/Kafka3O.UI.Persistence.Tests/AuditStoreTests.cs`
- **Manual Test Mapping:** Phase 3 steps 2-3, 7, 9 record audit events (viewed in Phase 4).
- **Subtasks:**
  - [ ] 3.1.1 Operation vocabulary and allowlisted targets
    - **Source:** TECH §14.4 (46 Gateway literals + 14 `app.*` values; target allowlist; never recorded fields), ADD §4.1 (`targetJson` ≤16,384 bytes, canonical JSON).
    - **Files:** Proposed `src/Kafka3O.UI.Server/Features/Audit/AuditOperation.cs`, `AuditTarget.cs`, `AuditModels.cs` (create).
    - **Symbols:** `AuditOperation.All` (60 values), `AuditOperation.IsValid(string)`; `AuditTarget` factory methods (`ForGatewayOperation(pathParams, confirmationTarget, extras)`, `ForLogin(providerId)`, `ForRole(roleId, name)`, `ForAssignment(...)`, `ForAuditRead(eventId)`, `ForRecovery(...)`, `Empty`); `AuditPhase` (ATTEMPT|RESULT|EVENT), `AuditOutcome` (pending|succeeded|failed|partial|denied|previewed|unknown).
    - **Implementation:** Typed builders accept only allowlisted fields; canonical serialization with sorted keys; reject targets over 16,384 bytes rather than truncating ambiguous identifiers.
    - **Dependencies:** Phase 2.
    - **Completion Check:** `AuditTargetTests`: only allowlisted keys serialize; key order sorted; oversize rejected; `AuditOperation.All.Count == 60` and excludes `gateway.m8`.
  - [ ] 3.1.2 Audit writer contract and persistence
    - **Source:** TECH §3.3-3.4 (`IAuditWriter` succeeds only after durable persistence), §7.4, §8.6 (5-second audit deadline), ADD §5 (result reserve independent of client disconnect).
    - **Files:** Proposed `src/Kafka3O.UI.Server/Features/Audit/IAuditWriter.cs`, `AuditUnavailableException.cs` (create); `src/Kafka3O.UI.Server/Infrastructure/Persistence/AuditStore.cs` (create).
    - **Symbols:** `IAuditWriter.RecordEventAsync(AuditEventDraft, CancellationToken) -> Guid`; `RecordAttemptAsync(AuditAttemptDraft, CancellationToken) -> Guid`; `RecordResultAsync(Guid attemptId, AuditResultDraft) -> AuditStatus` (own 5-second deadline, ignores request cancellation, honours host shutdown).
    - **Implementation:** Each call is one short transaction; success only after commit. Pre-action failures throw `AuditUnavailableException` (mapped to 503 `AUDIT_UNAVAILABLE`, outcome `not_started`). Result failures return `recording_failed` instead of throwing. ATTEMPT outcome always `pending`.
    - **Dependencies:** 3.1.1, 2.1.4.
    - **Completion Check:** `AuditStoreTests` (both providers): result for unknown attempt rejected by unique/logic check; second RESULT for same attempt rejected; result write after request cancellation still commits.

### Task 3.2: Antiforgery and the public bootstrap

- **Status:** Not Started
- **Source:** TECH §7.1, §8.3, §9.3 (`X-CSRF-TOKEN`, browser memory, refresh after login/logout), ADD §3.2 `GET /auth/bootstrap`
- **Outcome:** Every POST/PUT under `/api/v1` requires a valid antiforgery header; the public bootstrap returns configured providers and a token.
- **Dependencies:** Task 1.5
- **Affected Files:** Proposed `src/Kafka3O.UI.Server/Features/Identity/AntiforgerySetup.cs`, `BootstrapEndpoints.cs`, `src/Kafka3O.UI.Contracts/Features/Identity/BootstrapContracts.cs`, `tests/Kafka3O.UI.Server.Tests/Features/Identity/CsrfTests.cs`
- **Manual Test Mapping:** Phase 3 steps 1, 5.
- **Subtasks:**
  - [ ] 3.2.1 Antiforgery enforcement
    - **Source:** TECH §9.3, §8.3 (including sign-in initiation, emergency login, activity, logout), ADD §3.2 (all POST/PUT require `X-CSRF-TOKEN`), ADD §3.4 `CSRF_INVALID` 403.
    - **Files:** Proposed `src/Kafka3O.UI.Server/Features/Identity/AntiforgerySetup.cs` (create).
    - **Symbols:** `AddKafka3OAntiforgery`; endpoint filter `RequireAntiforgery` applied to every POST/PUT route group under `/api/v1`.
    - **Implementation:** Header name `X-CSRF-TOKEN`; antiforgery cookie Secure and HttpOnly; validation failure -> 403 `CSRF_INVALID`, outcome `not_started`, no forwarding. OIDC callbacks are outside `/api/v1` and excluded.
    - **Dependencies:** 1.5.4.
    - **Completion Check:** `CsrfTests`: missing header 403; wrong token 403; token from a different session 403; valid token passes.
  - [ ] 3.2.2 `GET /auth/bootstrap`
    - **Source:** ADD §3.2 row (providers `{id, displayName}`, `antiforgeryToken`, `emergencyEnabled:true`; no configuration secrets; no-store).
    - **Files:** Proposed `src/Kafka3O.UI.Server/Features/Identity/BootstrapEndpoints.cs` (create); `src/Kafka3O.UI.Contracts/Features/Identity/BootstrapContracts.cs` (create).
    - **Symbols:** `BootstrapResponse(IReadOnlyList<ProviderView> Providers, string AntiforgeryToken, bool EmergencyEnabled)`.
    - **Implementation:** Providers in order `entra`, `cognito` when configured; response wrapped in `ResultEnvelope` with `auditStatus: not_required`.
    - **Dependencies:** 3.2.1.
    - **Completion Check:** `BootstrapTests`: no OIDC config -> empty providers; body contains no issuer, client ID or secret.

### Task 3.3: Server-side sessions

- **Status:** Not Started
- **Source:** TECH §7.1, §8.5, §9.3, §10.5, ADD §3.2 (`/session*`), ADD §4.2
- **Outcome:** Sessions are opaque 32-byte identifiers stored as SHA-256 hashes, validated on every request against idle/absolute expiry, revocation and credential version, with atomic activity and revocation updates.
- **Dependencies:** Task 3.1
- **Affected Files:** Proposed `src/Kafka3O.UI.Server/Features/Identity/ISessionStore.cs`, `SessionAuthenticationHandler.cs`, `SessionContext.cs`, `SessionEndpoints.cs`, `SessionCookie.cs`, `src/Kafka3O.UI.Server/Infrastructure/Persistence/SessionStore.cs`, `src/Kafka3O.UI.Contracts/Features/Identity/SessionContracts.cs`, `tests/Kafka3O.UI.Server.Tests/Features/Identity/SessionExpiryTests.cs`, `tests/Kafka3O.UI.Persistence.Tests/SessionStoreTests.cs`
- **Manual Test Mapping:** Phase 3 steps 3-8.
- **Subtasks:**
  - [ ] 3.3.1 Session store with atomic updates
    - **Source:** ADD §4.2 (consistent read; conditional activity UPDATE; idempotent revocation; PostgreSQL row-level serialization, SQLite immediate transactions), TECH §10.5 (`now >= expiry` is expired; monotonic activity).
    - **Files:** Proposed `src/Kafka3O.UI.Server/Features/Identity/ISessionStore.cs`, `src/Kafka3O.UI.Server/Infrastructure/Persistence/SessionStore.cs` (create).
    - **Symbols:** `ISessionStore.InsertAsync(SessionRecordDraft, DbTransactionScope)`, `FindAsync(byte[] tokenHash) -> SessionSnapshot?`, `TouchActivityAsync(byte[] tokenHash, long nowMs, string? credentialVersion) -> bool`, `RevokeAsync(byte[] tokenHash, long nowMs) -> bool`, `RevokeAllAsync(long nowMs)`, `RevokeEmergencyExceptVersionAsync(string currentVersion, long nowMs)`.
    - **Implementation:** Activity: single `UPDATE ... SET lastActivityAt = MAX(lastActivityAt, @now) WHERE tokenHash=@h AND revokedAt IS NULL AND lastActivityAt + 14400000 > @now AND absoluteExpiresAt > @now [AND credentialVersion=@v]`; zero rows -> false. Revocation never clears `revokedAt`. Dependency errors surface as exceptions (503), never as "valid".
    - **Dependencies:** 3.1.2.
    - **Completion Check:** `SessionStoreTests` (both providers): concurrent activity and revoke never un-revoke; out-of-order activity never moves backward; activity at exactly idle expiry returns false.
  - [ ] 3.3.2 Session authentication handler and cookie
    - **Source:** TECH §8.5 (cookie `__Host-Kafka3O.Session`, Secure, HttpOnly, Path `/`, SameSite=Lax, no Domain), §9.3 (32 random bytes, SHA-256), §7.1 (no permissive cache; DB failure never anonymous), ADD §4.2.
    - **Files:** Proposed `src/Kafka3O.UI.Server/Features/Identity/SessionAuthenticationHandler.cs`, `SessionContext.cs`, `SessionCookie.cs` (create).
    - **Symbols:** `SessionAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>`; `SessionCookie.Issue(HttpResponse, byte[] token)`, `Clear(HttpResponse)`; `SessionContext` (hash, principal, authSource, times, claims snapshot).
    - **Implementation:** Decode base64url cookie (must be exactly 32 bytes), hash, load snapshot plus current role/assignment data in one read transaction (Phase 5 adds assignments), evaluate `now >= min(lastActivityAt + 4h, absoluteExpiresAt)`, `revokedAt`, emergency `credentialVersion` equals configured value, SSO issuer still configured. Failure -> 401 `SESSION_EXPIRED` and clear cookie; store exception -> 503 `DATABASE_UNAVAILABLE`. At startup, revoke emergency sessions whose credential version differs (TECH §14.3, ADD §6).
    - **Dependencies:** 3.3.1.
    - **Completion Check:** `SessionExpiryTests` with `FakeTimeProvider`: 1 ms before idle expiry valid, exact equality expired, absolute expiry never extended by activity; changed credential version -> 401.
  - [ ] 3.3.3 Session endpoints
    - **Source:** ADD §3.2 rows `GET /session`, `POST /session/activity`, `POST /session/logout`; TECH §14.4 (`app.session.read`, `app.session.activity`, `app.auth.logout`), ADD §5 (`no-store`).
    - **Files:** Proposed `src/Kafka3O.UI.Server/Features/Identity/SessionEndpoints.cs` (create); `src/Kafka3O.UI.Contracts/Features/Identity/SessionContracts.cs` (create).
    - **Symbols:** `Principal`, `SessionView`, `ActivityResponse(lastActivityAt, idleExpiresAt, absoluteExpiresAt)`, `LogoutResponse(revoked:true)`; endpoints mapped under `/api/v1/session`.
    - **Implementation:** `GET` returns `SessionView` without renewing; `activity` uses `TouchActivityAsync` (false -> 401); `logout` revokes, clears cookie, audits `app.auth.logout`; invalid session on logout -> 401 and clear. Emergency identity reads and activity are durably audited before responding (failure -> 503). `Instant` format: UTC, three fractional digits, `Z`.
    - **Dependencies:** 3.3.2, 3.2.1.
    - **Completion Check:** `SessionEndpointTests`: GET does not change `lastActivityAt`; logout then GET -> 401; emergency GET writes one `app.session.read` event; audit failure on emergency GET -> 503.

### Task 3.4: Emergency login with persistent throttling

- **Status:** Not Started
- **Source:** FUNC §3.2, TECH §7.2, §9.4, §10.4, ADD §3.2 `POST /auth/emergency`, ADD §4.3
- **Outcome:** The single emergency account signs in with its password, throttled per account/address with persisted escalation and a two-permit global limit; success atomically resets throttling, audits and creates the session.
- **Dependencies:** Tasks 3.2, 3.3
- **Affected Files:** Proposed `src/Kafka3O.UI.Server/Features/Identity/ILoginThrottleStore.cs`, `LoginThrottleService.cs`, `ClientAddressNormalizer.cs`, `EmergencyLoginService.cs`, `EmergencyLoginEndpoints.cs`, `src/Kafka3O.UI.Server/Infrastructure/Persistence/LoginThrottleStore.cs`, `src/Kafka3O.UI.Contracts/Features/Identity/EmergencyLoginRequest.cs`, `tests/Kafka3O.UI.Server.Tests/Features/Identity/ThrottleScheduleTests.cs`, `EmergencyLoginTests.cs`, `tests/Kafka3O.UI.Persistence.Tests/LoginThrottleStoreTests.cs`
- **Manual Test Mapping:** Phase 3 steps 2-3, 9.
- **Subtasks:**
  - [ ] 3.4.1 Throttle store with revision CAS
    - **Source:** ADD §4.1 LoginThrottle, ADD §4.3 (revision CAS in short transactions; insert conflict re-reads; pre-activation list ≤4 timestamps; saturated count 11).
    - **Files:** Proposed `src/Kafka3O.UI.Server/Features/Identity/ILoginThrottleStore.cs`, `src/Kafka3O.UI.Server/Infrastructure/Persistence/LoginThrottleStore.cs` (create).
    - **Symbols:** `ILoginThrottleStore.GetAsync(accountId, sourceAddress) -> ThrottleState?`; `SaveAsync(ThrottleState expected, ThrottleState next) -> bool` (CAS on revision); `ResetAsync(..., DbTransactionScope)`.
    - **Implementation:** Insert-or-CAS; uniqueness conflict re-reads and retries the state transition (never loses a failure). Never hold a transaction across hashing.
    - **Dependencies:** 2.1.4.
    - **Completion Check:** `LoginThrottleStoreTests` (both providers): concurrent failures from two tasks record two failures; state persists across a new `DbContext`.
  - [ ] 3.4.2 Throttle schedule and admission
    - **Source:** TECH §9.4 delay table (5->1s ... 11+->60s), §10.4 (rolling window, early rejection not counted, overload 429 `Retry-After: 1`), ADD §4.3 (IP normalization, trusted proxies, non-waiting mutex, two process-wide permits).
    - **Files:** Proposed `src/Kafka3O.UI.Server/Features/Identity/LoginThrottleService.cs`, `ClientAddressNormalizer.cs` (create).
    - **Symbols:** `LoginThrottleService.TryAdmitAsync(accountId, address, now) -> Admission` (`Admitted(lease)`, `Rejected(retryAfterSeconds)`); `RecordFailureAsync`, `RecordSuccess` (within caller transaction); `ClientAddressNormalizer.Normalize(IPAddress) -> string`.
    - **Implementation:** Non-waiting per-pair lock, then one of two global permits; failures -> 429 with `Retry-After` 1 and no hashing. Before activation drop timestamps `<= now-15min`; fifth failure activates delay 1s; 6-10 -> 2,4,8,16,32s; 11+ -> 60s with count saturated at 11; early arrival -> 429 `ceiling(remaining)` without hashing or moving `lastFailureAt`; reset on success or `now >= lastFailureAt + 15min`. Persistence failure -> deny with 503 and release permits.
    - **Dependencies:** 3.4.1.
    - **Completion Check:** `ThrottleScheduleTests` with `FakeTimeProvider`: fifth-failure boundary, each delay, 60s cap, early rejection without hash invocation (counting fake hasher), rolling-window expiry of a 16-minute-old failure, reset after success and after 15 minutes idle, third concurrent verification -> 429 `Retry-After: 1`.
  - [ ] 3.4.3 Emergency login endpoint
    - **Source:** ADD §3.2 `POST /auth/emergency` (password 1-4096 UTF-8 bytes, no normalization; 200 `SessionView`), ADD §4.3 last paragraph (success commits throttle reset, audit and session together; failure commits throttle then generic 401), TECH §7.4 (successful authentication requires durable audit), FUNC §3.2.
    - **Files:** Proposed `src/Kafka3O.UI.Server/Features/Identity/EmergencyLoginService.cs`, `EmergencyLoginEndpoints.cs` (create); `src/Kafka3O.UI.Contracts/Features/Identity/EmergencyLoginRequest.cs` (create).
    - **Symbols:** `EmergencyLoginService.LoginAsync(string password, IPAddress remote, CancellationToken) -> LoginOutcome`; `EmergencyLoginRequest(string Password)`.
    - **Implementation:** Validate length (400 otherwise); admit (3.4.2); verify with `PasswordHasher.VerifyHashedPassword` against the configured hash; on success generate 32 random bytes and in one transaction reset throttle, insert `app.auth.login` EVENT (succeeded, `authSource` emergency, subject = `Emergency:AccountId`) and insert the session; only then set the cookie and return `SessionView`. On failure commit the throttle update, then record a failure event (its failure never grants access) and return 401 `AUTHENTICATION_FAILED`. Cancellation after verification still completes the throttle write. Revoke the replaced session if a valid cookie was presented.
    - **Dependencies:** 3.4.2, 3.3.3, 3.1.2.
    - **Completion Check:** `EmergencyLoginTests`: correct password -> 200 and cookie flags; wrong -> 401 generic body; audit writer failing -> 503 and no `Set-Cookie`; password never appears in logs or audit (sentinel check).

### Task 3.5: Permission catalog, effective permissions, and the cluster directory

- **Status:** Not Started
- **Source:** FUNC §2.3, TECH §8.2 (as amended), §13.1, ADD §3.1 (`PermissionView`, `ClusterView`), ADD §3.2 (`GET /permissions`, `GET /clusters`), TECH §14.4 (denials)
- **Outcome:** The 49-literal catalog, effective-permission evaluation (emergency = all), the configuration registry, and `GET /clusters` and `GET /permissions`.
- **Dependencies:** Task 3.3
- **Affected Files:** Proposed `src/Kafka3O.UI.Server/Features/Access/PermissionCatalog.cs`, `IEffectivePermissionService.cs`, `EffectivePermissionService.cs`, `AccessDenial.cs`, `PermissionEndpoints.cs`, `src/Kafka3O.UI.Server/Features/Clusters/ClusterDirectoryEndpoints.cs`, `src/Kafka3O.UI.Server/Infrastructure/Configuration/ConfigurationRegistry.cs`, `src/Kafka3O.UI.Contracts/Features/Access/PermissionView.cs`, `src/Kafka3O.UI.Contracts/Features/Clusters/ClusterView.cs`, `tests/Kafka3O.UI.Server.Tests/Features/Access/PermissionCatalogTests.cs`, `tests/Kafka3O.UI.Server.Tests/Features/Clusters/ClusterDirectoryTests.cs`
- **Manual Test Mapping:** Phase 3 steps 3, 6.
- **Subtasks:**
  - [ ] 3.5.1 Permission catalog
    - **Source:** TECH §8.2 families (46 Gateway literals without `gateway.m8`, plus `app.access.manage`, `app.audit.view`, `gateway.lock.override`), ADD §3.1 `PermissionView{id,label,scope}` ordered by ID.
    - **Files:** Proposed `src/Kafka3O.UI.Server/Features/Access/PermissionCatalog.cs`, `PermissionEndpoints.cs` (create); `src/Kafka3O.UI.Contracts/Features/Access/PermissionView.cs` (create).
    - **Symbols:** `PermissionCatalog.All` (49), `IsKnown(string)`, `Scope(string) -> application|cluster`; `GET /api/v1/permissions` requiring `app.access.manage`.
    - **Implementation:** Ordinal ordering; `gateway.lock.override` scope cluster (it supplements cluster operations). Emergency reads audited as `app.permissions.list`.
    - **Dependencies:** 3.3.3.
    - **Completion Check:** `PermissionCatalogTests`: count 49, no `gateway.m8`, matches the database CHECK list from 2.1.2.
  - [ ] 3.5.2 Effective permissions and denial handling
    - **Source:** FUNC §2.3 bullets (union, default deny, emergency has all), TECH §7.1 (evaluate every request), TECH §14.4 (denial records attempted operation with outcome `denied`), ADD §3.4 `PERMISSION_DENIED`.
    - **Files:** Proposed `src/Kafka3O.UI.Server/Features/Access/IEffectivePermissionService.cs`, `EffectivePermissionService.cs`, `AccessDenial.cs` (create).
    - **Symbols:** `IEffectivePermissionService.GetApplicationPermissions(SessionContext) -> IReadOnlySet<string>`; `GetClusterPermissions(SessionContext, string clusterId) -> IReadOnlySet<string>`; `AccessDenial.DenyAsync(HttpContext, string operation, AuditTarget) -> IResult`.
    - **Implementation:** Emergency: all application permissions and all 47 cluster-scoped literals (46 Gateway + override) for every configured cluster. SSO evaluation (assignments) arrives in Task 5.3; until then SSO sessions get none. Denial: record EVENT (outcome `denied`; logging failure keeps the denial), return 403 `PERMISSION_DENIED` without revealing hidden registrations; zero forwarding.
    - **Dependencies:** 3.5.1.
    - **Completion Check:** `EffectivePermissionTests.Emergency_HasAllOnEveryCluster`; `AccessDenialTests.AuditFailure_StillDenies`.
  - [ ] 3.5.3 Configuration registry and `GET /clusters`
    - **Source:** ADD §3.1 `ClusterView` (no background Gateway call, no URL/secret/health), ADD §3.2 (ordered `environmentId` then `id`), TECH §14.2 (no availability field), TECH §16.4 (S4: `environmentDisplayName`, `environmentLabel`), FUNC §2.2 cluster-list item, DES §3.2.
    - **Files:** Proposed `src/Kafka3O.UI.Server/Infrastructure/Configuration/ConfigurationRegistry.cs`, `src/Kafka3O.UI.Server/Features/Clusters/ClusterDirectoryEndpoints.cs` (create); `src/Kafka3O.UI.Contracts/Features/Clusters/ClusterView.cs` (create).
    - **Symbols:** `IConfigurationRegistry.Environments`, `Gateways`, `TryGetGateway(string id, out GatewayRegistration)`; `ClusterView(string Id, string EnvironmentId, string EnvironmentDisplayName, string? EnvironmentLabel, string DisplayName, IReadOnlyList<string> PermissionIds)`; `GET /api/v1/clusters` -> `ClusterView[]`.
    - **Implementation:** Include only registrations with at least one effective Gateway grant; an empty list is allowed; permission IDs sorted ordinally; emergency read audited as `app.clusters.list`. Environment display name and label come from configuration (S4); no Gateway call, URL, secret reference or health data.
    - **Dependencies:** 3.5.2.
    - **Completion Check:** `ClusterDirectoryTests`: ordering; no `baseUrl` or key fields in JSON; SSO session without grants -> empty list.

### Task 3.6: Client sign-in, session handling, and cluster directory

- **Status:** Not Started
- **Source:** DES §3.1, §3.5 (P01-P03), §5.1, §7, §14.1, TECH §8.5 (activity only for explicit actions), §9.3 (token in memory), §10.6 (return paths)
- **Outcome:** The browser signs in through the emergency page, keeps the antiforgery token in memory, notifies activity only on explicit actions, shows the cluster directory and the identity indicator, and signs out.
- **Dependencies:** Tasks 3.2-3.5
- **Affected Files:** Proposed `src/Kafka3O.UI.Client/Http/ApiClient.cs`, `Http/ApiResult.cs`, `Http/AntiforgeryTokenStore.cs`, `Features/Identity/SessionState.cs`, `Features/Identity/ActivityNotifier.cs`, `Features/Identity/SignInPage.razor`, `Features/Identity/EmergencySignInPage.razor`, `Layout/ApplicationShell.razor`, `Layout/IdentityMenu.razor`, `Layout/ClusterSwitcher.razor`, `Features/Clusters/ClustersPage.razor`, `tests/Kafka3O.UI.Client.Tests/Features/Identity/*`, `tests/Kafka3O.UI.Browser.Tests/Identity/EmergencyLoginFlowTests.cs`
- **Manual Test Mapping:** Phase 3 steps 1-4, 7-9.
- **Subtasks:**
  - [ ] 3.6.1 Same-origin API client
    - **Source:** TECH §5.2 (Client `Http/`), §9.3, ADD §3.4 (envelope), TECH §11.3 (outcomes).
    - **Files:** Proposed `src/Kafka3O.UI.Client/Http/ApiClient.cs`, `ApiResult.cs`, `AntiforgeryTokenStore.cs` (create).
    - **Symbols:** `ApiClient.GetAsync<T>`, `PostAsync<TReq,T>`, `PutAsync<TReq,T>(..., string? ifMatch)` returning `ApiResult<T>` (`Success(data, meta, status, etag)` | `Failure(ErrorEnvelope)`); `AntiforgeryTokenStore.Token` (memory only).
    - **Implementation:** Adds `X-CSRF-TOKEN` to POST/PUT; on 401 clears session state and navigates to `/signin?returnPath=<current same-origin path>`; never stores tokens in browser storage.
    - **Dependencies:** 3.2.2.
    - **Completion Check:** bUnit `ApiClientTests` with a fake handler: header added; 401 triggers navigation; `localStorage` never touched (JS interop not invoked).
  - [ ] 3.6.2 Session state and explicit activity
    - **Source:** TECH §8.5 (explicit navigation and submitted actions call `/session/activity`; passive viewing and polling never), §7.1.
    - **Files:** Proposed `src/Kafka3O.UI.Client/Features/Identity/SessionState.cs`, `ActivityNotifier.cs` (create).
    - **Symbols:** `SessionState.Current`, `Changed` event, `LoadAsync()`, `Clear()`; `ActivityNotifier.NotifyUserActionAsync()`.
    - **Implementation:** Hook `NavigationManager.LocationChanged` only for user-initiated navigation (`IsNavigationIntercepted`) and form submissions; timers never call it. Refetch bootstrap after login and logout to refresh the antiforgery token.
    - **Dependencies:** 3.6.1.
    - **Completion Check:** bUnit `ActivityNotifierTests`: link navigation sends one activity request; a timer-driven refresh sends none.
  - [ ] 3.6.3 Sign-in and emergency pages
    - **Source:** DES §5.1 (password without default, cleared after submit/failure, server-supplied retry delay), DES §3.5 P01/P02, DES §14.1 (`/signin`, `/signin/emergency`), TECH §10.6 (validated same-origin `returnPath`).
    - **Files:** Proposed `src/Kafka3O.UI.Client/Features/Identity/SignInPage.razor` (modify), `EmergencySignInPage.razor` (create).
    - **Symbols:** `@page "/signin"`, `@page "/signin/emergency"`.
    - **Implementation:** Sign-in page renders provider buttons from bootstrap (wired in Phase 6) and the emergency link. Emergency form posts `{password}`, clears the field on every outcome, shows `Retry-After` seconds from 429, generic message on 401, "service unavailable" on 503; after success navigates to a validated relative `returnPath` or `/clusters`. Root `/` redirects to `/clusters` when a session exists.
    - **Dependencies:** 3.6.2.
    - **Completion Check:** bUnit `EmergencySignInPageTests`: field cleared after failure; 429 shows server delay text; external `returnPath` ignored.
  - [ ] 3.6.4 Shell identity, sign-out, cluster switcher, and directory page
    - **Source:** DES §3.1 (header shows cluster and identity; switcher groups by environment), §3.5 P03, §5.1 (persistent emergency indicator), §7 (no-access state), §14.1 (`/clusters`).
    - **Files:** Proposed `src/Kafka3O.UI.Client/Layout/IdentityMenu.razor`, `Layout/ClusterSwitcher.razor`, `Features/Clusters/ClustersPage.razor` (create); `Layout/ApplicationShell.razor` (modify).
    - **Symbols:** `@page "/clusters"`; `IdentityMenu` (display name, emergency indicator, "Sign out"); `ClusterSwitcher`.
    - **Implementation:** Directory groups clusters by environment and shows display name and inspectable ID; no-access state keeps application navigation when the user has application permissions. Sign out posts logout, clears state, refetches bootstrap and navigates to `/signin`.
    - **Dependencies:** 3.6.3, 3.5.3.
    - **Completion Check:** Phase 3 steps 3, 7; bUnit `ClustersPageTests` for grouping and no-access state.
  - [ ] 3.6.5 Browser flow test
    - **Source:** V6, V7, V9 (storage inspection), TECH §4.3.
    - **Files:** Proposed `tests/Kafka3O.UI.Browser.Tests/Identity/EmergencyLoginFlowTests.cs` (create).
    - **Symbols:** `Login_ThrottleThenSuccess_ShowsDirectory`, `Cookie_HasApprovedFlags`, `Storage_ContainsNoTokens`, `Logout_InvalidatesSession`.
    - **Implementation:** Uses `PublishedAppFixture` with a generated emergency hash; inspects cookies and storage through Playwright.
    - **Dependencies:** 3.6.4.
    - **Completion Check:** Named tests pass in Chromium.

---

## Phase 4: Audit history is viewable and filterable

- **Phase Status:** Not Started
- **Goal:** A user with audit viewing permission lists, filters and inspects application audit events, including unresolved attempts, with the approved paging and ordering.
- **Manual Test Plan:**
  1. Sign in with the emergency account and open "Audit History". Expect a table ordered newest first containing `app.auth.login` events with outcomes `failed` and `succeeded`, `app.auth.logout`, and `app.clusters.list` from Phase 3 actions, each with time, identity, operation, phase, outcome and correlation ID.
  2. Filter Outcome = `failed`. Expect only failed login events; the URL contains no filter text other than allowed resource identity (filters are kept in page state).
  3. Open one event. Expect `/audit/{eventId}` showing phase, identity (`emergency`), empty or allowlisted target, correlation ID, and no password.
  4. Run `curl -s -b "__Host-Kafka3O.Session=$S" "http://localhost:8080/api/v1/audit?operation=not.real"`. Expect `400` with `"code":"VALIDATION_FAILED"`.
  5. Run `curl -s -b "__Host-Kafka3O.Session=$S" "http://localhost:8080/api/v1/audit?pageSize=501"`. Expect `400`. With `pageSize=2`, expect `data.page.size` 2 and `data.page.total` as a decimal string greater than 2.

### Task 4.1: Audit query API

- **Status:** Not Started
- **Source:** FUNC §3.7, TECH §10.3, ADD §3.2 (`GET /audit`, `GET /audit/{id}`), ADD §3.3 (`AuditEventView`, filters, resolution), TECH §14.4 (operation filter vocabulary)
- **Outcome:** Paged, filtered audit history and event detail with computed resolution, requiring `app.audit.view`.
- **Dependencies:** Phase 3
- **Affected Files:** Proposed `src/Kafka3O.UI.Server/Features/Audit/IAuditReader.cs`, `AuditQuery.cs`, `AuditEndpoints.cs`, `src/Kafka3O.UI.Server/Infrastructure/Persistence/AuditStore.cs`, `src/Kafka3O.UI.Contracts/Features/Audit/AuditContracts.cs`, `tests/Kafka3O.UI.Server.Tests/Features/Audit/AuditQueryTests.cs`, `tests/Kafka3O.UI.Persistence.Tests/AuditReaderTests.cs`
- **Manual Test Mapping:** Phase 4 steps 1-5.
- **Subtasks:**
  - [ ] 4.1.1 Query validation
    - **Source:** ADD §3.3 filters (`from` inclusive, `to` exclusive; `authSource`; paired `issuer`+`subject`; `environmentId`; `clusterId`; exact `operation`; `outcome`; unknown/invalid -> 400), TECH §10.3 (pageNumber ≥1, pageSize default 50 max 500), TECH §14.4.
    - **Files:** Proposed `src/Kafka3O.UI.Server/Features/Audit/AuditQuery.cs` (create).
    - **Symbols:** `AuditQuery.TryParse(IQueryCollection, out AuditQuery, out IReadOnlyList<FieldError>)`.
    - **Implementation:** Reject unknown parameters, reversed ranges, only one SSO identity component, operations outside `AuditOperation.All`, invalid enums; emergency filter uses `authSource` + `subject`.
    - **Dependencies:** 3.1.1.
    - **Completion Check:** `AuditQueryTests` cover each rejection and default paging.
  - [ ] 4.1.2 Reader with consistent count and resolution
    - **Source:** ADD §3.3 (count and page in one read transaction; ordering `occurredAt DESC, id DESC`; `resolution` computed from retained records; `relatedEventIds`), TECH §3.4 (`IAuditReader` separate from writer).
    - **Files:** Proposed `src/Kafka3O.UI.Server/Features/Audit/IAuditReader.cs` (create); `src/Kafka3O.UI.Server/Infrastructure/Persistence/AuditStore.cs` (modify).
    - **Symbols:** `IAuditReader.QueryAsync(AuditQuery, CancellationToken) -> Page<AuditEventView>`; `GetAsync(Guid id) -> AuditEventView?`.
    - **Implementation:** ATTEMPT with RESULT -> `resolved`; ATTEMPT without RESULT -> `unresolved`; RESULT whose ATTEMPT was deleted by retention -> `related_event_expired`; EVENT -> `not_applicable`. Never infer Kafka state.
    - **Dependencies:** 4.1.1.
    - **Completion Check:** `AuditReaderTests` (both providers): tie ordering by ID; total counts all matches; unresolved attempt reported.
  - [ ] 4.1.3 Audit endpoints
    - **Source:** ADD §3.2 rows (require `app.audit.view`; emergency reads audited; absent event 404), TECH §14.4 (`app.audit.list`, `app.audit.read`).
    - **Files:** Proposed `src/Kafka3O.UI.Server/Features/Audit/AuditEndpoints.cs` (create); `src/Kafka3O.UI.Contracts/Features/Audit/AuditContracts.cs` (create).
    - **Symbols:** `GET /api/v1/audit` -> `Page<AuditEventView>`; `GET /api/v1/audit/{id}` -> `AuditEventView`.
    - **Implementation:** Permission check then (emergency) durable read audit, then query; denial via `AccessDenial`; malformed UUID -> 400; missing -> 404.
    - **Dependencies:** 4.1.2, 3.5.2.
    - **Completion Check:** `AuditEndpointTests`: no permission -> 403 and a denial event; emergency read writes `app.audit.list`.

### Task 4.2: Audit history page

- **Status:** Not Started
- **Source:** DES §3.5 P27, §5.1 (table columns, filters, unresolved attempts), §6.1, §14.1 (`/audit`, `/audit/{eventId}`), DES §9 (`AuditEventDetail`, `ResourceTable`)
- **Outcome:** Paginated, filterable audit table and event detail page.
- **Dependencies:** Task 4.1
- **Affected Files:** Proposed `src/Kafka3O.UI.Client/Features/Audit/AuditHistoryPage.razor`, `Features/Audit/AuditEventPage.razor`, `Features/Shared/ResourceTable.razor`, `Features/Shared/ErrorSummary.razor`, `Features/Shared/StatusIndicator.razor`, `tests/Kafka3O.UI.Client.Tests/Features/Audit/AuditHistoryPageTests.cs`
- **Manual Test Mapping:** Phase 4 steps 1-3.
- **Subtasks:**
  - [ ] 4.2.1 Shared table, status, and error components
    - **Source:** DES §6.1 (semantic tables, pagination, loading/empty), §7 states, §8.2 (error summary focus), DES §9.
    - **Files:** Proposed `src/Kafka3O.UI.Client/Features/Shared/ResourceTable.razor`, `StatusIndicator.razor`, `ErrorSummary.razor` (create).
    - **Symbols:** `ResourceTable<TItem>` (columns, page, loading, empty template); `StatusIndicator` (text + icon, never color only); `ErrorSummary` (linked field errors, focus on show).
    - **Implementation:** Native `<table>` with headers; page-local sorting labelled as such; busy state announced.
    - **Dependencies:** Phase 1 shell.
    - **Completion Check:** bUnit `ResourceTableTests` (empty and loading states), `ErrorSummaryTests` (focus moves to summary).
  - [ ] 4.2.2 Audit list and detail pages
    - **Source:** DES §5.1 audit paragraph, DES §14.1, ADD §3.3.
    - **Files:** Proposed `src/Kafka3O.UI.Client/Features/Audit/AuditHistoryPage.razor`, `AuditEventPage.razor` (create); `Layout/ApplicationShell.razor` (modify: Application navigation "Audit History" when `app.audit.view`).
    - **Symbols:** `@page "/audit"`, `@page "/audit/{EventId:guid}"`.
    - **Implementation:** Filters for time range, principal, environment, cluster, operation (select from vocabulary), outcome; unresolved attempts labelled "Unresolved"; no payload viewer or delete/export controls.
    - **Dependencies:** 4.2.1, 4.1.3.
    - **Completion Check:** bUnit `AuditHistoryPageTests`: filter change requests page 1; unresolved label shown; navigation hidden without permission.

---

## Phase 5: Administrators manage roles and assignments

- **Phase Status:** Not Started
- **Goal:** A user with access administration creates and edits named roles from the fixed catalog and provider-qualified assignments (including disable/re-enable), protected by strong revisions and fail-closed auditing.
- **Manual Test Plan:**
  1. Add `Oidc:Entra` to `appsettings.Development.json` with `Issuer` `https://localhost:9/entra/v2.0`, `ClientId` `manual-test`, `DisplayName` `Microsoft Entra ID`; restart and sign in with the emergency account. Expect the Application navigation to show "Roles and Assignments".
  2. Open Roles and click "Create role". Expect permission choices grouped by feature and action, 49 choices in total, no `gateway.m8`, and `app.access.manage` labelled as an application-wide privilege that can grant access.
  3. Create role "Topic readers" with `gateway.t1` and `gateway.t2`. Expect the role in the list with those two permissions.
  4. Create role "topic READERS". Expect an inline error stating the name already exists and no second role.
  5. Open "Topic readers" in two browser tabs. Rename it to "Topic viewers" in tab A and save. In tab B add `gateway.t3` and save. Expect tab B to show a conflict message, keep its unsaved selection for review, and offer "Reload current values"; after reload the name is "Topic viewers" without `gateway.t3`.
  6. Open Assignments and create: provider `entra`, match kind Claim, claim type `groups`, value `kafka-readers`, role "Topic viewers", scope Environment `dev`. Expect the assignment listed as Enabled.
  7. Create the same assignment again. Expect a "duplicate mapping" error. Try claim type `department`. Expect a field error that the claim type is not allowed.
  8. Disable the assignment and save. Expect it listed as Disabled; re-enable it. Expect Enabled.
  9. Open Audit History. Expect `app.role.create`, `app.role.update` (one `succeeded`, one stale-revision `failed`), `app.assignment.create`, and `app.assignment.update` events, each role or assignment change showing an ATTEMPT and a RESULT sharing the attempt ID.

### Task 5.1: Role administration API

- **Status:** Not Started
- **Source:** FUNC §2.3, D4, TECH §8.3, §10.2, §11.4, §7.4 (role change row), ADD §3.1 (`RoleInput`, `RoleView`), ADD §3.2 (role routes), ADD §3.3 (normalization), ADD §4.2 (local access changes)
- **Outcome:** Roles are listed, created and replaced with fixed permission IDs, normalized unique names, strong ETags, exact `If-Match` validation, and a durable attempt followed by an atomic change and result.
- **Dependencies:** Phase 4
- **Affected Files:** Proposed `src/Kafka3O.UI.Server/Features/Access/RoleName.cs`, `RoleInputValidator.cs`, `IRoleStore.cs`, `RoleEndpoints.cs`, `AccessChangeExecutor.cs`, `Revisions.cs`, `src/Kafka3O.UI.Server/Infrastructure/Persistence/RoleStore.cs`, `src/Kafka3O.UI.Contracts/Features/Access/RoleContracts.cs`, `tests/Kafka3O.UI.Server.Tests/Features/Access/RoleEndpointTests.cs`, `tests/Kafka3O.UI.Persistence.Tests/RoleStoreTests.cs`
- **Manual Test Mapping:** Phase 5 steps 2-5, 9.
- **Subtasks:**
  - [ ] 5.1.1 Role name normalization and input validation
    - **Source:** ADD §3.3 (trim Unicode whitespace, NFC, 1-100 scalars, no control characters; `normalizedName = ToUpperInvariant(name).Normalize(NFC)` up to 300 scalars), ADD §3.1 (unique catalog literals, at most 49, empty bundle valid).
    - **Files:** Proposed `src/Kafka3O.UI.Server/Features/Access/RoleName.cs`, `RoleInputValidator.cs` (create).
    - **Symbols:** `RoleName.TryCreate(string raw, out RoleName, out FieldError?)` with `Value` and `Normalized`; `RoleInputValidator.Validate(RoleInput) -> IReadOnlyList<FieldError>`.
    - **Implementation:** Duplicates, unknown IDs and `gateway.m8` rejected with `VALIDATION_FAILED`; no DB collation involved.
    - **Dependencies:** 3.5.1.
    - **Completion Check:** `RoleNameTests`: leading/trailing whitespace trimmed; `"ﬁ"` NFC handling; 101 scalars rejected; control character rejected; `RoleInputValidatorTests`: `gateway.m8` rejected, empty list accepted.
  - [ ] 5.1.2 Revision headers
    - **Source:** TECH §10.2 (strong quoted UUID ETag), §11.4 (exactly one strong quoted UUID; missing -> 428; malformed, weak, wildcard or multiple -> 400; stale -> 412).
    - **Files:** Proposed `src/Kafka3O.UI.Server/Features/Access/Revisions.cs` (create).
    - **Symbols:** `Revisions.FormatETag(Guid) -> string`; `Revisions.ParseIfMatch(StringValues) -> IfMatchResult` (`Missing`, `Invalid`, `Value(Guid)`).
    - **Implementation:** Lowercase hyphenated UUID inside double quotes; `W/` prefix, `*`, lists and unquoted values are invalid.
    - **Dependencies:** None.
    - **Completion Check:** `RevisionsTests` cover each rejection category.
  - [ ] 5.1.3 Role store with atomic compare-and-write
    - **Source:** TECH §10.2 (comparison and write atomic), ADD §4.2 (new UUID revision, complete permission replacement, RESULT together after separately committed ATTEMPT), ADD §3.2 list ordering (normalized name, then ID), TECH §10.3.
    - **Files:** Proposed `src/Kafka3O.UI.Server/Features/Access/IRoleStore.cs`, `src/Kafka3O.UI.Server/Infrastructure/Persistence/RoleStore.cs` (create).
    - **Symbols:** `IRoleStore.ListAsync(int pageNumber, int pageSize) -> Page<RoleView>`; `GetAsync(Guid id)`; `CreateAsync(RoleName, IReadOnlyList<string>, Guid attemptId, AuditResultDraft) -> RoleView`; `ReplaceAsync(Guid id, Guid expectedRevision, RoleName, IReadOnlyList<string>, Guid attemptId, AuditResultDraft) -> ReplaceOutcome` (`Replaced`, `NotFound`, `Stale`, `Duplicate`).
    - **Implementation:** One transaction per change: `UPDATE Roles SET ... revision=@new WHERE id=@id AND revision=@expected` (0 rows -> stale or not found), replace RolePermissions, insert the RESULT audit row; unique-violation on `normalizedName` -> `Duplicate` (409), rolled back.
    - **Dependencies:** 5.1.1, 3.1.2.
    - **Completion Check:** `RoleStoreTests` (both providers): two replacements with the same revision -> exactly one commits; duplicate normalized name -> `Duplicate`; permissions fully replaced.
  - [ ] 5.1.4 Role endpoints with fail-closed audit
    - **Source:** ADD §3.2 role rows (201 `RoleView` + ETag; PUT 200 + ETag), TECH §7.4 (attempt first; failure -> no change), ADD §4.2 (stale-revision rejection writes failure event), TECH §14.4 (`app.role.create`, `app.role.update`, `app.roles.list`), FUNC §2.3 (privileged capability).
    - **Files:** Proposed `src/Kafka3O.UI.Server/Features/Access/RoleEndpoints.cs`, `AccessChangeExecutor.cs` (create); `src/Kafka3O.UI.Contracts/Features/Access/RoleContracts.cs` (create).
    - **Symbols:** `GET/POST /api/v1/roles`, `PUT /api/v1/roles/{id}`; `AccessChangeExecutor.ExecuteAsync(operation, target, Func<Guid, Task<Outcome>>)`; `RoleInput`, `RoleView`.
    - **Implementation:** Order: session, `app.access.manage` (denial event otherwise), CSRF (filter), input validation, `If-Match` (PUT), durable ATTEMPT (failure -> 503, no change), store call with RESULT in the same transaction; stale -> RESULT `failed` with 412; request body limit 131,072 bytes.
    - **Dependencies:** 5.1.2, 5.1.3.
    - **Completion Check:** `RoleEndpointTests`: attempt-write failure -> 503 and zero role rows; missing `If-Match` 428; weak 400; stale 412 with a failure RESULT; success returns the new ETag.

### Task 5.2: Assignment administration API

- **Status:** Not Started
- **Source:** FUNC §2.2 (assignment/mapping), §3.1 item 3, TECH §8.3, ADD §3.1 (`AssignmentInput`, `enabled`), ADD §3.3 (assignment validation), ADD §4.1 (`duplicateKey`), ADD §4.1 last paragraph (no delete; configuration removal makes assignments ineffective)
- **Outcome:** Provider-qualified subject/claim assignments at environment/cluster scope are created, replaced, disabled and re-enabled, with duplicate detection and the same revision and audit rules as roles.
- **Dependencies:** Task 5.1
- **Affected Files:** Proposed `src/Kafka3O.UI.Server/Features/Access/AssignmentValidator.cs`, `AssignmentDuplicateKey.cs`, `IAssignmentStore.cs`, `AssignmentEndpoints.cs`, `AssignmentConfigurationDiagnostics.cs`, `src/Kafka3O.UI.Server/Infrastructure/Persistence/AssignmentStore.cs`, `src/Kafka3O.UI.Contracts/Features/Access/AssignmentContracts.cs`, `tests/Kafka3O.UI.Server.Tests/Features/Access/AssignmentEndpointTests.cs`, `tests/Kafka3O.UI.Persistence.Tests/AssignmentStoreTests.cs`
- **Manual Test Mapping:** Phase 5 steps 6-9.
- **Subtasks:**
  - [ ] 5.2.1 Assignment validation and duplicate key
    - **Source:** ADD §3.3 paragraph 2 (configured provider; subject -> `claimType=null`; claim -> allowlisted claim type; match value non-empty ≤2,048 UTF-8 bytes, no control characters; scope exists; role exists), ADD §4.1 (`duplicateKey` = SHA-256 over canonical JSON excluding `enabled`/`revision`/`id`), TECH §14.3 `AllowedClaimTypes`.
    - **Files:** Proposed `src/Kafka3O.UI.Server/Features/Access/AssignmentValidator.cs`, `AssignmentDuplicateKey.cs` (create).
    - **Symbols:** `AssignmentValidator.Validate(AssignmentInput, IConfigurationRegistry, bool roleExists) -> IReadOnlyList<FieldError>`; `AssignmentDuplicateKey.Compute(AssignmentInput) -> byte[32]`.
    - **Implementation:** Identity and claim values are case-sensitive and never trimmed or normalized; environment scope must match a configured environment, cluster scope a configured gateway.
    - **Dependencies:** 5.1.1.
    - **Completion Check:** `AssignmentValidatorTests`: `department` claim rejected; subject with claim type rejected; unknown scope rejected; `AssignmentDuplicateKeyTests`: `enabled` change keeps the key; case change changes it.
  - [ ] 5.2.2 Assignment store and endpoints
    - **Source:** ADD §3.2 assignment rows (201/200 with ETag, `If-Match`), ADD §4.1 (unique `duplicateKey`; collision with unequal fields -> sanitized `INTERNAL_ERROR` plus security diagnostic; duplicates rejected even when disabled), TECH §10.3 (ordering by ID), TECH §14.4 (`app.assignment.create`, `app.assignment.update`, `app.assignments.list`).
    - **Files:** Proposed `src/Kafka3O.UI.Server/Features/Access/IAssignmentStore.cs`, `AssignmentEndpoints.cs` (create); `src/Kafka3O.UI.Server/Infrastructure/Persistence/AssignmentStore.cs` (create); `src/Kafka3O.UI.Contracts/Features/Access/AssignmentContracts.cs` (create).
    - **Symbols:** `GET/POST /api/v1/assignments`, `PUT /api/v1/assignments/{id}`; `AssignmentInput`, `AssignmentView`; `IAssignmentStore.CreateAsync`, `ReplaceAsync` (same outcome set as roles).
    - **Implementation:** Reuse `AccessChangeExecutor` and `Revisions`; `enabled` defaults to true when omitted; disabling or re-enabling is a normal PUT.
    - **Dependencies:** 5.2.1, 5.1.4.
    - **Completion Check:** `AssignmentEndpointTests`: duplicate (even disabled) -> 409 `DUPLICATE_RESOURCE`; re-enable via PUT succeeds; `AssignmentStoreTests` (both providers): concurrent duplicate inserts -> one 201, one 409.
  - [ ] 5.2.3 Startup diagnostics for removed configuration
    - **Source:** ADD §4.1 last paragraph (referenced configuration removal makes affected assignments ineffective and emits a startup diagnostic; never broadens scope).
    - **Files:** Proposed `src/Kafka3O.UI.Server/Features/Access/AssignmentConfigurationDiagnostics.cs` (create).
    - **Symbols:** `AssignmentConfigurationDiagnostics.RunAsync(CancellationToken)` (hosted at startup).
    - **Implementation:** Log a structured warning per assignment whose provider, claim type or scope is no longer configured (IDs only); evaluation in Task 5.3 ignores such assignments.
    - **Dependencies:** 5.2.2.
    - **Completion Check:** `AssignmentConfigurationDiagnosticsTests`: removed environment -> warning with assignment ID and no match value.

### Task 5.3: Effective permissions from assignments

- **Status:** Not Started
- **Source:** FUNC §2.3 bullets (union of cluster and environment assignments; default deny; application permissions application-wide), FUNC §3.1 items 3-4 (missing claims never imply access), TECH §7.1, ADD §4.2 (session and current role/assignment data in one consistent read)
- **Outcome:** SSO sessions receive the union of enabled matching assignments for each cluster and its environment, evaluated on every request.
- **Dependencies:** Task 5.2
- **Affected Files:** Proposed `src/Kafka3O.UI.Server/Features/Access/EffectivePermissionService.cs` (modify), `src/Kafka3O.UI.Server/Features/Identity/SessionAuthenticationHandler.cs` (modify), `src/Kafka3O.UI.Server/Infrastructure/Persistence/SessionStore.cs` (modify), `tests/Kafka3O.UI.Server.Tests/Features/Access/EffectivePermissionTests.cs`
- **Manual Test Mapping:** Verified automatically; exercised end to end by Phase 6 tests.
- **Subtasks:**
  - [ ] 5.3.1 Load access data with the session
    - **Source:** ADD §4.2 paragraph 1.
    - **Files:** Proposed `src/Kafka3O.UI.Server/Infrastructure/Persistence/SessionStore.cs` (modify), `src/Kafka3O.UI.Server/Features/Identity/SessionAuthenticationHandler.cs` (modify).
    - **Symbols:** `ISessionStore.FindWithAccessAsync(byte[] tokenHash) -> (SessionSnapshot, AccessSnapshot)`.
    - **Implementation:** One read transaction returns the session plus enabled assignments matching the session's provider and their roles' permissions; no cache across requests.
    - **Dependencies:** 5.2.2.
    - **Completion Check:** `SessionStoreTests.FindWithAccess_ReturnsOnlyEnabledMatchingAssignments` (both providers).
  - [ ] 5.3.2 Evaluate matches and unions
    - **Source:** FUNC §2.3; ADD §3.3 (case-sensitive matching); TECH §8.2 (application permissions not cluster-isolated).
    - **Files:** Proposed `src/Kafka3O.UI.Server/Features/Access/EffectivePermissionService.cs` (modify).
    - **Symbols:** `GetClusterPermissions(SessionContext, string clusterId)`; `GetApplicationPermissions(SessionContext)`.
    - **Implementation:** Subject assignments match `providerId` + session `subject`; claim assignments match an exact value of an allowlisted claim type in the verified login snapshot. Cluster permissions = union over assignments scoped to the cluster or its environment, restricted to cluster-scoped literals; application permissions = union of application-scoped literals from any matching assignment. Ineffective assignments (5.2.3) are ignored.
    - **Dependencies:** 5.3.1.
    - **Completion Check:** `EffectivePermissionTests`: environment + cluster union; other environment not leaked; disabled assignment ignored; missing claim grants nothing; `app.access.manage` alone yields no cluster permission.

### Task 5.4: Roles and assignments pages

- **Status:** Not Started
- **Source:** DES §3.5 P25/P26, §5.1 (grouped permissions, application-wide labelling, conflict review), §14.1 (`/access/roles`, `/access/assignments`), TECH §10.2, §11.4
- **Outcome:** Tabbed workspace for roles and assignments with grouped fixed permissions, conflict review on 412, disable/re-enable, and no delete controls.
- **Dependencies:** Tasks 5.1, 5.2
- **Affected Files:** Proposed `src/Kafka3O.UI.Client/Features/Access/RolesPage.razor`, `RoleEditor.razor`, `AssignmentsPage.razor`, `AssignmentEditor.razor`, `AccessWorkspaceTabs.razor`, `PermissionGroups.cs`, `tests/Kafka3O.UI.Client.Tests/Features/Access/RoleEditorTests.cs`, `AssignmentEditorTests.cs`, `tests/Kafka3O.UI.Browser.Tests/Access/RoleConflictTests.cs`
- **Manual Test Mapping:** Phase 5 steps 1-8.
- **Subtasks:**
  - [ ] 5.4.1 Roles tab and editor
    - **Source:** DES §5.1 paragraph 2, DES §3.5 P25, ADD §3.1.
    - **Files:** Proposed `src/Kafka3O.UI.Client/Features/Access/RolesPage.razor`, `RoleEditor.razor`, `AccessWorkspaceTabs.razor`, `PermissionGroups.cs` (create).
    - **Symbols:** `@page "/access/roles"`; `PermissionGroups.Group(IEnumerable<PermissionView>)` (Cluster, Topics, Messages, Groups, Kafka security, Application).
    - **Implementation:** Loads `/permissions`; keeps ETag per role; on 412 shows conflict with the user's unsaved input and "Reload current values"; on 428/400 shows a precondition error; `app.access.manage` carries an application-wide warning.
    - **Dependencies:** 5.1.4, 4.2.1.
    - **Completion Check:** bUnit `RoleEditorTests`: 412 keeps input and shows reload; no delete button.
  - [ ] 5.4.2 Assignments tab and editor
    - **Source:** DES §3.5 P26 (enabled/disabled state, disable/re-enable, application-wide meaning of administrative grants), ADD §3.3.
    - **Files:** Proposed `src/Kafka3O.UI.Client/Features/Access/AssignmentsPage.razor`, `AssignmentEditor.razor` (create).
    - **Symbols:** `@page "/access/assignments"`.
    - **Implementation:** Provider choices from bootstrap providers; claim type choices free text validated server-side; scope ID as text with suggestions from `/clusters` when available (administrators without Kafka grants can still type configured IDs); Enabled toggle.
    - **Dependencies:** 5.2.2, 5.4.1.
    - **Completion Check:** bUnit `AssignmentEditorTests`: subject kind hides claim type; toggle sends `enabled:false` with `If-Match`.
  - [ ] 5.4.3 Browser conflict test
    - **Source:** V5, TECH §10.2.
    - **Files:** Proposed `tests/Kafka3O.UI.Browser.Tests/Access/RoleConflictTests.cs` (create).
    - **Symbols:** `TwoTabs_SecondSaveShowsConflict`.
    - **Implementation:** Two browser contexts edit the same role; second save receives 412 and the conflict view.
    - **Dependencies:** 5.4.1.
    - **Completion Check:** Named test passes in Chromium.

---

## Phase 6: Users sign in with Entra ID or Cognito (automated verification)

- **Phase Status:** Not Started
- **Goal:** Both OIDC providers can be configured side by side; SSO users sign in through PKCE authorization-code flow, receive permissions from assignments, and one provider's outage never blocks the other or emergency access.
- **Manual Test Plan:**
  1. Configure `Oidc:Entra` with issuer `https://localhost:9/entra/v2.0` and `Oidc:Cognito` with issuer `https://localhost:9/cognito`, restart, and open `/signin`. Expect buttons "Microsoft Entra ID" and "Amazon Cognito" plus the "Emergency sign in" link.
  2. Click "Microsoft Entra ID". Expect to stay on `/signin` with the message "Microsoft Entra ID is unavailable. Try again later or use another sign-in option." and no session cookie.
  3. Click "Emergency sign in" and sign in. Expect success (provider outage does not block emergency access).
  4. Run `pwsh scripts/test.ps1 -Suite api -Filter "Category=Oidc"`. Expect all OIDC API tests to pass, covering both providers in one deployment, invalid issuer/audience/signature/expiry/state/nonce/callback, distinct principals with equal emails, and claim-based cluster access.
  5. Run `pwsh scripts/test.ps1 -Suite browser -Filter "Category=Oidc"`. Expect the mock-issuer browser sign-in tests for both providers to pass.

### Task 6.1: OIDC authentication schemes and sign-in initiation

- **Status:** Not Started
- **Source:** FUNC §3.1 items 1-3, 8, D3, TECH §1.2 (ASP.NET Core OIDC), §7.1, §8.5 (correlation/nonce cookies SameSite=None), §10.6 (fixed callbacks, exact redirect URIs, PKCE), ADD §3.2 `POST /auth/login/{providerId}`, TECH §14.3 `Oidc:*`
- **Outcome:** Each configured provider has its own scheme, fixed callback path, exact issuer and audience validation and PKCE; sign-in initiation returns a handler-generated authorization URL.
- **Dependencies:** Phase 5
- **Affected Files:** Proposed `src/Kafka3O.UI.Server/Features/Identity/OidcSetup.cs`, `OidcLoginEndpoints.cs`, `ReturnPath.cs`, `src/Kafka3O.UI.Contracts/Features/Identity/OidcContracts.cs`, `tests/Kafka3O.UI.Server.Tests/Features/Identity/OidcLoginTests.cs`, `ReturnPathTests.cs`
- **Manual Test Mapping:** Phase 6 steps 1-2.
- **Subtasks:**
  - [ ] 6.1.1 Register provider schemes
    - **Source:** TECH §10.6 (`/signin-oidc/entra`, `/signin-oidc/cognito`; issuer/audience, state, nonce, correlation, PKCE), §8.5, FUNC §3.1 item 2, TECH §14.3.
    - **Files:** Proposed `src/Kafka3O.UI.Server/Features/Identity/OidcSetup.cs` (create).
    - **Symbols:** `AddKafka3OOidc(AuthenticationBuilder, Kafka3OOptions)`; schemes `entra`, `cognito`.
    - **Implementation:** `Authority` = `Issuer`; `ResponseType` code; `UsePkce` true; `ClientSecret` from `ClientSecretFile` when present; `CallbackPath` fixed; `TokenValidationParameters.ValidIssuer` exact, `ValidAudience` = `ClientId`; `MapInboundClaims` false; `SaveTokens` false; correlation and nonce cookies Secure, SameSite=None; no application cookie sign-in scheme (session issued in Task 6.2); metadata retrieval errors surface as `IDENTITY_PROVIDER_UNAVAILABLE`.
    - **Dependencies:** 1.3.1.
    - **Completion Check:** `OidcLoginTests.SchemesRegisteredOnlyForConfiguredProviders`; wrong issuer token rejected (Task 6.3 tests).
  - [ ] 6.1.2 Return-path validation
    - **Source:** ADD §3.2 (`returnPath` ≤2,048 UTF-8 bytes, same-origin relative), TECH §10.6 (reject external and protocol-relative destinations; never resume a mutation).
    - **Files:** Proposed `src/Kafka3O.UI.Server/Features/Identity/ReturnPath.cs` (create).
    - **Symbols:** `ReturnPath.TryValidate(string? value, out string safePath)`.
    - **Implementation:** Must start with a single `/`; reject `//`, `/\`, backslashes, control characters, schemes, and paths under `/api/`; default `/clusters`.
    - **Dependencies:** None.
    - **Completion Check:** `ReturnPathTests`: `//evil.example`, `/\evil`, `https://x`, `/api/v1/x` rejected; `/clusters/local` accepted.
  - [ ] 6.1.3 `POST /auth/login/{providerId}`
    - **Source:** ADD §3.2 row (200 `{authorizationUrl}` generated by the handler with correlation/nonce cookies; public; allowlisted provider), ADD §3.2 paragraph after table (challenge failure -> sanitized 503, no partial session).
    - **Files:** Proposed `src/Kafka3O.UI.Server/Features/Identity/OidcLoginEndpoints.cs` (create); `src/Kafka3O.UI.Contracts/Features/Identity/OidcContracts.cs` (create).
    - **Symbols:** `OidcLoginRequest(string ReturnPath)`; `OidcLoginResponse(string AuthorizationUrl)`.
    - **Implementation:** Unknown provider -> 404 `NOT_FOUND`; validated return path stored in authentication properties; capture the authorization URL in `OnRedirectToIdentityProvider` and `HandleResponse()` so the endpoint returns JSON instead of a redirect; CSRF required.
    - **Dependencies:** 6.1.1, 6.1.2, 3.2.1.
    - **Completion Check:** `OidcLoginTests`: response contains the mock issuer's authorize URL with `code_challenge` and `state`; correlation cookie set; unreachable issuer -> 503 `IDENTITY_PROVIDER_UNAVAILABLE`.

### Task 6.2: OIDC callback, identity, and session issuance

- **Status:** Not Started
- **Source:** FUNC §3.1 items 2-5, TECH §7.1, §7.4 (successful authentication requires durable audit), ADD §3.2 paragraph after table, ADD §4.1 Sessions (claims only verified configured matching claims, bounded), ADD §4.2 (login audit and session insertion commit together)
- **Outcome:** A validated callback creates an `(issuer, subject)` principal with an allowlisted claim snapshot, durably audits the login, issues the session, and redirects to the validated return path.
- **Dependencies:** Task 6.1
- **Affected Files:** Proposed `src/Kafka3O.UI.Server/Features/Identity/OidcCallbackHandler.cs`, `ClaimSnapshot.cs`, `tests/Kafka3O.UI.Server.Tests/Features/Identity/OidcCallbackTests.cs`
- **Manual Test Mapping:** Automated; Phase 6 steps 4-5.
- **Subtasks:**
  - [ ] 6.2.1 Build the verified claim snapshot
    - **Source:** FUNC §3.1 item 3 (provider-qualified; missing or incomplete group claims never imply access; Graph overage not assumed), ADD §4.1 (`claimsJson` ≤65,536 bytes).
    - **Files:** Proposed `src/Kafka3O.UI.Server/Features/Identity/ClaimSnapshot.cs` (create).
    - **Symbols:** `ClaimSnapshot.FromValidatedToken(ClaimsPrincipal, OidcProviderOptions) -> ClaimSnapshot`; `ToCanonicalJson()`.
    - **Implementation:** Keep only `AllowedClaimTypes` values plus bounded `name` and `email` display fields; an Entra overage indicator (`_claim_names`/`hasgroups`) means the group claim is treated as absent; snapshot over 65,536 bytes rejects the login as `AUTHENTICATION_FAILED` (implementation guidance) and is audited.
    - **Dependencies:** 6.1.1.
    - **Completion Check:** `ClaimSnapshotTests`: disallowed claim types dropped; overage -> no groups; oversize rejected.
  - [ ] 6.2.2 Callback handling and session issuance
    - **Source:** ADD §3.2 (session only after durable authentication auditing, then redirect to validated local return path), ADD §4.2 (atomic audit + session insert; revoke replaced session), TECH §14.4 (`app.auth.login` with `providerId` target), FUNC §3.1 item 3 (identity is issuer + subject; emails never merge).
    - **Files:** Proposed `src/Kafka3O.UI.Server/Features/Identity/OidcCallbackHandler.cs` (create); `OidcSetup.cs` (modify: events).
    - **Symbols:** `OidcCallbackHandler.OnTokenValidatedAsync(TokenValidatedContext)`, `OnRemoteFailureAsync(RemoteFailureContext)`.
    - **Implementation:** On token validated: principal `authSource` = provider type, `issuer` = token `iss`, `subject` = `sub`; one transaction inserts the `app.auth.login` succeeded EVENT and the session; set cookie; redirect to the stored return path; `HandleResponse()`. Audit or DB failure -> redirect to `/signin?error=unavailable`, no cookie. Remote failure (state, nonce, signature, audience, expiry, callback mismatch) -> audited failure event and redirect to `/signin?error=provider`, no details.
    - **Dependencies:** 6.2.1, 3.3.1, 3.1.2.
    - **Completion Check:** `OidcCallbackTests`: audit failure -> no `Set-Cookie`; nonce mismatch -> redirect with `error=provider` and a failure event.

### Task 6.3: Mock OIDC issuer, SSO tests, and client wiring

- **Status:** Not Started
- **Source:** FUNC §3.8 (mock OIDC issuers in normal suites), TECH §4.1, §4.3 (both providers in one deployment, invalid protocol inputs, identity separation, permission unions), §4.4 (opt-in real IdP), V2, V3, V8, DES §5.1
- **Outcome:** A reusable mock issuer drives API and browser tests for both providers; the sign-in page starts provider flows and shows provider-specific errors; an opt-in real-IdP suite exists.
- **Dependencies:** Task 6.2
- **Affected Files:** Proposed `tests/Kafka3O.UI.TestSupport/Oidc/MockOidcIssuer.cs`, `tests/Kafka3O.UI.Server.Tests/Features/Identity/OidcFlowTests.cs`, `tests/Kafka3O.UI.Browser.Tests/Identity/OidcSignInTests.cs`, `tests/Kafka3O.UI.ExternalIntegration.Tests/Kafka3O.UI.ExternalIntegration.Tests.csproj`, `tests/Kafka3O.UI.ExternalIntegration.Tests/Identity/RealIdentityProviderTests.cs`, `src/Kafka3O.UI.Client/Features/Identity/SignInPage.razor`
- **Manual Test Mapping:** Phase 6 steps 1-5.
- **Subtasks:**
  - [ ] 6.3.1 Mock OIDC issuer
    - **Source:** TECH §4.3 paragraph 3 (discovery, authorization, token and signing-key behavior for valid and invalid flows).
    - **Files:** Proposed `tests/Kafka3O.UI.TestSupport/Oidc/MockOidcIssuer.cs` (create).
    - **Symbols:** `MockOidcIssuer(string issuerPath)` with `.WithSubject(sub)`, `.WithClaims(type, values)`, `.WithEmail(email)`, fault modes `WrongIssuer`, `WrongAudience`, `Expired`, `BadSignature`, `NonceMismatch`, `Unavailable`.
    - **Implementation:** Runs in-process behind a backchannel `HttpMessageHandler` for API tests and on a loopback HTTPS port for browser tests; RSA signing keys generated per test run.
    - **Dependencies:** None.
    - **Completion Check:** `MockOidcIssuerTests`: discovery document and JWKS served; each fault mode produces the expected token defect.
  - [ ] 6.3.2 SSO API tests
    - **Source:** V2, V3, V8; FUNC §3.1 items 3, 8.
    - **Files:** Proposed `tests/Kafka3O.UI.Server.Tests/Features/Identity/OidcFlowTests.cs` (create).
    - **Symbols:** `[Trait("Category","Oidc")]` tests: `BothProviders_SignIn_InOneDeployment`, `InvalidProtocol_CreatesNoSession` (theory over fault modes and callback/scheme mismatch), `EqualEmails_DistinctPrincipals`, `ClaimAssignment_GrantsClusterAccess`, `MissingClaim_GrantsNothing`, `ProviderOutage_OtherProviderAndEmergencyWork`, `MembershipChange_AppliesAtNextLogin`.
    - **Implementation:** Drive the authorization-code flow through `WebApplicationFactory` with cookies preserved; assert `GET /clusters` results for permission cases.
    - **Dependencies:** 6.3.1, Task 5.3.
    - **Completion Check:** Phase 6 step 4.
  - [ ] 6.3.3 Sign-in page provider flow and browser tests
    - **Source:** DES §5.1 (provider failure affects that provider only), DES §3.5 P01, ADD §3.2.
    - **Files:** Proposed `src/Kafka3O.UI.Client/Features/Identity/SignInPage.razor` (modify); `tests/Kafka3O.UI.Browser.Tests/Identity/OidcSignInTests.cs` (create).
    - **Symbols:** Provider button handler posting `/auth/login/{id}` then `NavigationManager.NavigateTo(authorizationUrl, forceLoad: true)`; `?error=provider|unavailable` messages naming the provider.
    - **Implementation:** 503 shows "<DisplayName> is unavailable. Try again later or use another sign-in option."; buttons for other providers and emergency remain enabled.
    - **Dependencies:** 6.1.3, 6.3.1.
    - **Completion Check:** Phase 6 steps 1-3 and 5.
  - [ ] 6.3.4 Opt-in real identity-provider suite
    - **Source:** TECH §4.4 (separately configured, opt-in real IdP checks), §5.3 (`ExternalIntegration.Tests`), FUNC §3.8 (missing prerequisites reported skipped).
    - **Files:** Proposed `tests/Kafka3O.UI.ExternalIntegration.Tests/Kafka3O.UI.ExternalIntegration.Tests.csproj`, `ExternalIntegrationSettings.cs`, `Identity/RealIdentityProviderTests.cs` (create).
    - **Symbols:** `ExternalIntegrationSettings.Load()` (from environment variable `KAFKA3O_IT_CONFIG` pointing to a JSON file outside the repo); `[Trait("Category","ExternalIdp")]`.
    - **Implementation:** Tests skip with reason "not verified" when settings are absent; never run in the default suite.
    - **Dependencies:** 6.3.2.
    - **Completion Check:** `pwsh scripts/test.ps1 -Suite external` without settings reports these tests skipped, not passed.

---

## Phase 7: Cluster overview and health through the Gateway

- **Phase Status:** Not Started
- **Goal:** A permitted user opens a cluster and sees its identity, brokers, liveness, readiness and partition health through the configured Gateway, with per-cluster failure isolation, correct credential tiers, classified errors and emergency-read auditing.
- **Manual Test Plan:**
  1. Start Kafka and the Gateway `local` as described in the environment table, then sign in with the emergency account. Expect `/clusters` to list `local` and `offline`, each with a health indicator; `local` shows Live and Ready, `offline` shows "Gateway unavailable".
  2. Open `local`. Expect `/clusters/local` with the Kafka cluster ID, controller, and a broker table (ID, host, port, rack), separate Liveness and Readiness panels, and partition health totals.
  3. Open `offline` in a second tab. Expect "Gateway unavailable" with a sanitized reason and no cluster data; the `local` tab keeps working.
  4. Stop the Gateway process. Within 30 seconds the `local` overview shows "Gateway unavailable" and a "Last observed" time for the earlier data marked stale. Restart the Gateway. Within 30 seconds the panels return to current values.
  5. Leave the overview open for 70 seconds, then run `curl -s -b "__Host-Kafka3O.Session=$S" http://localhost:8080/api/v1/session`. Expect `data.lastActivityAt` unchanged since the last click (polling does not renew activity).
  6. Run `curl -s -b "__Host-Kafka3O.Session=$S" http://localhost:8080/api/v1/clusters/local/cluster`. Expect `{"data":{...},"meta":{"requestId":"<uuid>","auditStatus":"recorded"}}`. In Audit History, filter operation `gateway.c1`. Expect ATTEMPT and RESULT events for the emergency identity with cluster `local`.
  7. Replace `config/local/local-reader.key` with a wrong key and restart the UI. Open `local`. Expect "Gateway credential failure" on the overview while you stay signed in.
  8. Run `curl -i -X POST -b "__Host-Kafka3O.Session=$S" http://localhost:8080/api/v1/clusters/local/replays`. Expect `404` with `"code":"NOT_FOUND"` and no request in the Gateway log.

### Task 7.1: Gateway operation catalog and pinned contract fixture

- **Status:** Not Started
- **Source:** ADD §2.1 (pinned revision `91b7a24`, fixture SHA-256), ADD §2.2 matrix, ADD §11.1, TECH §9.1, §13.1, FUNC §3.8 contract traceability, V1
- **Outcome:** One catalog holds the 46 active operation rows (permission, method, path, tier, kind, audit profile, schema names), checked against the pinned OpenAPI fixture.
- **Dependencies:** Phase 6
- **Affected Files:** Proposed `src/Kafka3O.UI.Server/Infrastructure/Gateway/GatewayOperationCatalog.cs`, `GatewayOperation.cs`, `tests/Kafka3O.UI.Server.Tests/Contract/Fixtures/openapi.golden.json`, `tests/Kafka3O.UI.Server.Tests/Contract/OperationCatalogTests.cs`
- **Manual Test Mapping:** Phase 7 steps 2, 6, 8 depend on the catalog rows.
- **Subtasks:**
  - [ ] 7.1.1 Catalog rows
    - **Source:** ADD §2.2 rows except deferred M8; ADD §2.1 (tier R/W, kinds R/W/D, audit profiles A/B/C).
    - **Files:** Proposed `src/Kafka3O.UI.Server/Infrastructure/Gateway/GatewayOperation.cs`, `GatewayOperationCatalog.cs` (create).
    - **Symbols:** `GatewayOperation(string Permission, HttpMethod Method, string GatewayPath, CredentialTier Tier, OperationKind Kind, AuditProfile Profile, string? RequestSchema, string SuccessSchema)`; `GatewayOperationCatalog.All` (46), `Get(string permission)`; `UiPath` derived as `/api/v1/clusters/{clusterId}` + suffix after `/v1`.
    - **Implementation:** Data only; endpoint registration happens per feature phase. `gateway.m8` absent.
    - **Dependencies:** None.
    - **Completion Check:** `OperationCatalogTests.Count_Is46_And_ExcludesM8`; 17 rows of kind D.
  - [ ] 7.1.2 Pinned fixture and catalog contract test
    - **Source:** ADD §2.1 (pin a reviewed copy; do not fetch `$ref` at runtime), TECH §9.1 validation (41 IDs / 47 operations; 46 active mappings; no collisions), ADD §7 (harness artifacts to capture with fixture work).
    - **Files:** Proposed `tests/Kafka3O.UI.Server.Tests/Contract/Fixtures/openapi.golden.json` (create, copied from Gateway `91b7a24` `internal/api/testdata/openapi.golden.json`), `tests/Kafka3O.UI.Server.Tests/Contract/OperationCatalogTests.cs` (create).
    - **Symbols:** `Fixture_HashMatchesPinned`, `Fixture_Has41Ids47Operations`, `Catalog_MatchesFixtureMinusM8` (method, path, command ID extension, request/response schema names), `Catalog_NoDuplicateUiRoutes`.
    - **Implementation:** Test asserts fixture SHA-256 `9326149125E05A2D30AECE7E4E4A6612631AF61770BEB4DB685B40CE9F86113A`; reads the command-ID extension used by the Gateway to identify operations.
    - **Dependencies:** 7.1.1.
    - **Completion Check:** Named tests pass; editing any catalog path fails `Catalog_MatchesFixtureMinusM8`.

### Task 7.2: Typed Gateway transport and error classification

- **Status:** Not Started
- **Source:** FUNC §2.1, §2.4, TECH §2.3 (typed client), §7.5 (5-second connect), §8.6, §14.2, ADD §2.1 (encode once, config-only destinations, reject redirects), ADD §3.4, ADD §5 (20,000,000-byte response cap; no retries), TECH §14.3 `Tls:CaCertificateFile`
- **Outcome:** Per-registration HTTP clients send authenticated, correlated requests only to configured destinations with the correct credential tier, enforce caps and deadlines, never retry, and classify every upstream response.
- **Dependencies:** Task 7.1
- **Affected Files:** Proposed `src/Kafka3O.UI.Server/Infrastructure/Gateway/GatewayHttpClientFactory.cs`, `GatewayClient.cs`, `GatewayRequest.cs`, `GatewayResponse.cs`, `GatewayErrorClassifier.cs`, `GatewayCredentials.cs`, `tests/Kafka3O.UI.TestSupport/Gateway/RecordingGatewayHandler.cs`, `tests/Kafka3O.UI.Server.Tests/Infrastructure/Gateway/GatewayClientTests.cs`, `GatewayErrorClassifierTests.cs`
- **Manual Test Mapping:** Phase 7 steps 1-4, 7.
- **Subtasks:**
  - [ ] 7.2.1 Per-registration HTTP clients and credentials
    - **Source:** TECH §7.5 (5-second connection timeout), ADD §2.1 (reject redirects; base URL and credentials only from configuration), TECH §14.3 (`Tls:CaCertificateFile` trusted in addition to system trust; validation never disabled), FUNC §2.1 (credential chosen after authorization).
    - **Files:** Proposed `src/Kafka3O.UI.Server/Infrastructure/Gateway/GatewayHttpClientFactory.cs`, `GatewayCredentials.cs` (create).
    - **Symbols:** `GatewayHttpClientFactory.Get(string gatewayId) -> HttpClient`; `GatewayCredentials.For(string gatewayId, CredentialTier) -> string` (loaded at startup from key files; never logged).
    - **Implementation:** `SocketsHttpHandler` with `ConnectTimeout` 5s, `AllowAutoRedirect=false`, pooled connection lifetime; certificate validation: accept system-trusted chains, otherwise rebuild the chain with `X509ChainTrustMode.CustomRootTrust` using the configured bundle; any other error rejects. No resilience/retry handlers.
    - **Dependencies:** 1.3.2.
    - **Completion Check:** `GatewayClientTests`: redirect response is not followed; self-signed server trusted only with its bundle configured.
  - [ ] 7.2.2 Request construction and response limits
    - **Source:** FUNC §2.4 (`X-Api-Key`, valid `X-Request-Id`), ADD §2.1 (encode resource identifiers once as path segments), ADD §5 (20,000,000 decoded bytes; count actual bytes; never truncate), TECH §8.6 deadlines.
    - **Files:** Proposed `src/Kafka3O.UI.Server/Infrastructure/Gateway/GatewayClient.cs`, `GatewayRequest.cs`, `GatewayResponse.cs` (create).
    - **Symbols:** `GatewayClient.SendAsync(GatewayRequest, CancellationToken) -> GatewayResponse`; `GatewayRequest(string GatewayId, GatewayOperation Op, IReadOnlyDictionary<string,string> PathValues, IReadOnlyDictionary<string,string?> Query, ReadOnlyMemory<byte>? Body, string ContentType, CredentialTier Tier, string RequestId, string? BreakGlassReason)`; `GatewayResponse(int Status, ReadOnlyMemory<byte> Body, string? ContentType, TimeSpan? RetryAfter, string? UpstreamRequestId)`.
    - **Implementation:** Path values escaped with `Uri.EscapeDataString` once; query built from validated values; body streamed; response read with a counting buffer, exceeding the cap -> `UpstreamResponseTooLarge`; the caller's linked deadline token cancels the call; cancellation after dispatch is reported as dispatched.
    - **Dependencies:** 7.2.1.
    - **Completion Check:** `GatewayClientTests`: topic `a/b` encoded as `a%2Fb`; 20,000,001-byte body -> too large; reader key sent for tier R, operator key for tier W.
  - [ ] 7.2.3 Error classification
    - **Source:** ADD §3.4 catalog rows (`UPSTREAM_REJECTED`, `UPSTREAM_CREDENTIAL_FAILURE`, `UPSTREAM_FAILURE`, `UPSTREAM_RESPONSE_TOO_LARGE`, `UPSTREAM_TIMEOUT`) and paragraph after table, TECH §14.2 (`UPSTREAM_OPERATION_UNAVAILABLE`), FUNC §2.4 (Gateway 401 is not user logout), FUNC §3.5 (preserve safety codes).
    - **Files:** Proposed `src/Kafka3O.UI.Server/Infrastructure/Gateway/GatewayErrorClassifier.cs` (create).
    - **Symbols:** `GatewayErrorClassifier.Classify(GatewayResponse?, Exception?, bool dispatched, OperationKind kind) -> ErrorEnvelope?`.
    - **Implementation:** Envelope = JSON object with `error.code` string. 404/405 without envelope -> 502 `UPSTREAM_OPERATION_UNAVAILABLE` `not_started`; 401 -> 502 `UPSTREAM_CREDENTIAL_FAILURE`; 400/403/404/409/413/429 with envelope -> `UPSTREAM_REJECTED` with sanitized `upstreamCode` (for example `READ_ONLY_MODE`, `DATA_PLANE_LOCKED`) and validated `Retry-After`; 5xx, protocol errors, malformed success bodies -> 502 `UPSTREAM_FAILURE`; timeout -> 504 `UPSTREAM_TIMEOUT`. Outcome `unknown` for dispatched mutations unless non-execution is established; reads use `failed`.
    - **Dependencies:** 7.2.2.
    - **Completion Check:** `GatewayErrorClassifierTests`: plain-text 404 -> unavailable; JSON `NOT_FOUND` -> rejected with upstream code; 401 -> credential failure; mutation timeout -> `unknown`.
  - [ ] 7.2.4 Recording Gateway fake
    - **Source:** FUNC §3.8, TECH §4.3 paragraph 3 (ordering, counts, destinations, credentials, headers, payloads; errors, delays, cancellation, post-send uncertainty).
    - **Files:** Proposed `tests/Kafka3O.UI.TestSupport/Gateway/RecordingGatewayHandler.cs`, `tests/Kafka3O.UI.TestSupport/Gateway/FakeGatewayServer.cs` (create).
    - **Symbols:** `RecordingGatewayHandler.Respond(method, path, response)`, `.Delay(...)`, `.FailAfterSend(...)`, `.Requests`; `FakeGatewayServer` (loopback HTTPS host with a generated certificate for browser tests).
    - **Implementation:** Unexpected requests fail the test; responses scripted per route.
    - **Dependencies:** None.
    - **Completion Check:** `RecordingGatewayHandlerTests`: unscripted request throws; recorded headers include `X-Api-Key` and `X-Request-Id`.

### Task 7.3: Lossless numeric transformation

- **Status:** Not Started
- **Source:** TECH §7.5 (int64 as decimal strings across the browser boundary; strict parsing; no floating point), ADD §3.1 (`Int64String` pattern; nested map values; Int32 stays integer; convert only schema-designated fields back), FUNC §2.4 numeric precision, V13
- **Outcome:** Gateway JSON is converted to the UI representation and back exactly, driven by a field map derived from the pinned schema.
- **Dependencies:** Task 7.1
- **Affected Files:** Proposed `src/Kafka3O.UI.Server/Infrastructure/Gateway/Int64FieldMap.cs`, `GatewayJsonTransformer.cs`, `src/Kafka3O.UI.Contracts/Features/Common/Int64String.cs`, `tests/Kafka3O.UI.Server.Tests/Infrastructure/Gateway/GatewayJsonTransformerTests.cs`, `tests/Kafka3O.UI.Server.Tests/Contract/Int64FieldMapTests.cs`
- **Manual Test Mapping:** Phase 7 step 2 (offsets and IDs display exactly); larger values in Phases 9 and 14.
- **Subtasks:**
  - [ ] 7.3.1 Int64 field map with fixture check
    - **Source:** ADD §3.1 paragraph 2; ADD §2.1 (inherit referenced schema recursively).
    - **Files:** Proposed `src/Kafka3O.UI.Server/Infrastructure/Gateway/Int64FieldMap.cs` (create); `tests/Kafka3O.UI.Server.Tests/Contract/Int64FieldMapTests.cs` (create).
    - **Symbols:** `Int64FieldMap.ForSchema(string schemaName) -> IReadOnlyList<JsonPathPattern>` (supports array items and map values).
    - **Implementation:** Hand-maintained map; the test walks the fixture and asserts the map equals the set of `integer`/`int64` locations reachable from each active request/response schema.
    - **Dependencies:** 7.1.2.
    - **Completion Check:** `Int64FieldMapTests.Map_EqualsFixtureInt64Locations`.
  - [ ] 7.3.2 Transformer and `Int64String`
    - **Source:** ADD §3.1 (`0|-?[1-9][0-9]*`, signed int64 range; nonnegative fields reject negatives; missing/null/zero/empty distinct).
    - **Files:** Proposed `src/Kafka3O.UI.Server/Infrastructure/Gateway/GatewayJsonTransformer.cs` (create); `src/Kafka3O.UI.Contracts/Features/Common/Int64String.cs` (create).
    - **Symbols:** `GatewayJsonTransformer.ToUi(ReadOnlySpan<byte> gatewayJson, string schema) -> byte[]`; `ToGateway(ReadOnlySpan<byte> uiJson, string schema) -> byte[]`; `Int64String.TryParse(string, bool nonNegative, out long)`.
    - **Implementation:** Stream with `Utf8JsonReader`/`Utf8JsonWriter`, copying raw number tokens at designated locations into strings (and strings back to raw numbers after validation); message payload content is never touched; `$schema` annotations stripped from UI output.
    - **Dependencies:** 7.3.1.
    - **Completion Check:** `GatewayJsonTransformerTests`: `9223372036854775807` round-trips exactly; `-1` rejected for a nonnegative field; `01` rejected; nested map values converted; a number inside a record value untouched.

### Task 7.4: Shared operation executor with admission, deadlines, and audit profiles

- **Status:** Not Started
- **Source:** TECH §2.3, §3.2 (no operation-specific branches in shared enforcement), FUNC §3.4 (workflow and states), ADD §2.1 (audit profiles A/B/C; override needs `gateway.lock.override` and a reason on that request), ADD §5 (16 concurrent Gateway calls process-wide, 4 per session, no queue; deadline nesting; 5-second result reserve), TECH §9.2, §10.1, §14.2, TECH §16.5 (S5 override transport)
- **Outcome:** Every Gateway-backed endpoint uses one executor that resolves the cluster, authorizes, validates, audits per profile, admits, applies deadlines, dispatches once, and returns `{data, meta}` or a classified error.
- **Dependencies:** Tasks 7.2, 7.3
- **Affected Files:** Proposed `src/Kafka3O.UI.Server/Features/Clusters/GatewayOperationExecutor.cs`, `OperationRequest.cs`, `OverrideReason.cs`, `GatewayAdmission.cs`, `OperationDeadline.cs`, `GatewayEndpointRegistration.cs`, `tests/Kafka3O.UI.Server.Tests/Features/Clusters/GatewayOperationExecutorTests.cs`
- **Manual Test Mapping:** Phase 7 steps 2, 6, 8.
- **Subtasks:**
  - [ ] 7.4.1 Admission and deadlines
    - **Source:** ADD §5 rows (Other Gateway responses: 16 global / 4 per session, 429 `Retry-After: 1`; Deadlines) and paragraph on monotonic deadlines; TECH §8.6.
    - **Files:** Proposed `src/Kafka3O.UI.Server/Features/Clusters/GatewayAdmission.cs`, `OperationDeadline.cs` (create).
    - **Symbols:** `GatewayAdmission.TryEnter(sessionHash) -> IDisposable?`; `OperationDeadline.Start(TimeProvider, OperationKind, TimeSpan? sampleDuration) -> OperationDeadline` with `Remaining`, `CanStartMutation()` (execution budget + 5s reserve fits within 85s application deadline).
    - **Implementation:** Non-waiting counters; read 30s, mutation 60s, throughput sample+10s (max 70s), application 85s; linked `CancellationTokenSource` per stage.
    - **Dependencies:** None.
    - **Completion Check:** `GatewayAdmissionTests`: fifth concurrent call in one session -> rejected; seventeenth process-wide -> rejected; `OperationDeadlineTests` with `FakeTimeProvider`.
  - [ ] 7.4.2 Override reason validation (S5)
    - **Source:** FUNC §3.5 (non-empty reason, 512-byte cap, control-character rules, `X-Break-Glass-Reason` only for the authorized request), TECH §16.5, ADD §4.1 (`overrideReason` ≤512 bytes).
    - **Files:** Proposed `src/Kafka3O.UI.Server/Features/Clusters/OverrideReason.cs` (create).
    - **Symbols:** `OverrideReason.TryRead(HttpRequest, out string? reason, out FieldError?)`.
    - **Implementation:** Header absent -> no override; present -> must be non-empty, ≤512 UTF-8 bytes, no control characters, else 400. Only operations M1-M7 accept it (others 400).
    - **Dependencies:** None.
    - **Completion Check:** `OverrideReasonTests`: 512-byte multibyte string accepted, 513 rejected; tab character rejected; header on `gateway.c1` rejected.
  - [ ] 7.4.3 Executor pipeline
    - **Source:** FUNC §3.4 Mermaid branches; ADD §2.1 audit profiles; TECH §7.4 (pre-action durable audit; result independent of cancellation); TECH §9.2/§10.1 (`recording_failed` keeps known result); ADD §3.1 (server request ID propagated to Gateway); ADD §2.2 note (preserve 201 and 207).
    - **Files:** Proposed `src/Kafka3O.UI.Server/Features/Clusters/GatewayOperationExecutor.cs`, `OperationRequest.cs` (create).
    - **Symbols:** `GatewayOperationExecutor.ExecuteAsync(HttpContext, OperationRequest, CancellationToken) -> IResult`; `OperationRequest(string ClusterId, GatewayOperation Op, pathValues, query, body, AuditTarget target, bool dryRun, Func<ValidationResult> validate)`.
    - **Implementation:** Order: resolve `clusterId` among configured registrations (unknown -> 404); effective cluster permission for `Op.Permission` (plus `gateway.lock.override` when a reason is present) else denial event and 403; operation validation (400, `not_started`); audit: profile A -> ATTEMPT/RESULT only for emergency identity or override; B -> ATTEMPT/RESULT; C -> ATTEMPT/RESULT for previews and executions with `dryRun` flag; ATTEMPT failure -> 503 `AUDIT_UNAVAILABLE` and zero Gateway calls; admission; deadline (`CanStartMutation` for W/D); dispatch once; classify; RESULT outcome (`succeeded`, `partial` for 207, `previewed`, `failed`, `unknown`); response `{data, meta:{requestId, auditStatus}}` with the upstream status (200/201/207). Never retry.
    - **Dependencies:** 7.4.1, 7.4.2, 3.1.2, 3.5.2.
    - **Completion Check:** `GatewayOperationExecutorTests`: denial -> zero recorded Gateway requests; ATTEMPT failure -> zero requests; RESULT failure -> `recording_failed` with the original data; 207 passthrough with outcome `partial`; timeout on mutation -> 504 `unknown` and exactly one request.
  - [ ] 7.4.4 Explicit endpoint registration helper
    - **Source:** TECH §9.1 (explicit registration, never catch-all), ADD §11.1 (unregistered -> 404).
    - **Files:** Proposed `src/Kafka3O.UI.Server/Features/Clusters/GatewayEndpointRegistration.cs` (create).
    - **Symbols:** `MapGatewayOperation(this IEndpointRouteBuilder, string permission, Func<HttpContext, OperationRequestBuilder, Task<IResult>> handler)`.
    - **Implementation:** Registers exactly the catalog row's UI method and path; duplicate registration throws at startup; POST/PUT/PATCH/DELETE require antiforgery.
    - **Dependencies:** 7.4.3.
    - **Completion Check:** `EndpointRegistrationTests.RegisteringTwice_Throws`; `/api/v1/clusters/local/replays` -> 404 with zero Gateway requests.

### Task 7.5: Cluster overview and health endpoints (C1, C3, C4)

- **Status:** Not Started
- **Source:** FUNC §2.5 rows C1, C3, C4; ADD §2.2 rows `gateway.c1`, `gateway.c3.live`, `gateway.c3.ready`, `gateway.c4`; FUNC §3.3
- **Outcome:** Four read endpoints with UI DTOs mirroring the pinned schemas.
- **Dependencies:** Task 7.4
- **Affected Files:** Proposed `src/Kafka3O.UI.Server/Features/Clusters/ClusterInspectionEndpoints.cs`, `src/Kafka3O.UI.Contracts/Features/Clusters/ClusterOverviewContracts.cs`, `tests/Kafka3O.UI.Server.Tests/Features/Clusters/ClusterOverviewEndpointTests.cs`, `tests/Kafka3O.UI.Server.Tests/Contract/DtoSchemaConformanceTests.cs`
- **Manual Test Mapping:** Phase 7 steps 1-4, 6-7.
- **Subtasks:**
  - [ ] 7.5.1 UI DTOs and schema conformance test
    - **Source:** ADD §2.1 (inherit schema recursively; strip `$schema`; int64 as strings), ADD §2.2 (`DescribeClusterBody`, `LiveBody`, `ReadyBody`, `ClusterHealthBody`).
    - **Files:** Proposed `src/Kafka3O.UI.Contracts/Features/Clusters/ClusterOverviewContracts.cs` (create); `tests/Kafka3O.UI.Server.Tests/Contract/DtoSchemaConformanceTests.cs` (create).
    - **Symbols:** `DescribeClusterDto`, `LiveDto`, `ReadyDto`, `ClusterHealthDto` (records); `DtoSchemaConformanceTests.Dto_MatchesSchema(Type dto, string schema)` theory.
    - **Implementation:** Reflection compares JSON property names, required/nullable flags and types (int64 -> `string`) with the fixture; later phases add their DTO pairs to the theory data.
    - **Dependencies:** 7.3.1.
    - **Completion Check:** Theory passes for the four pairs; renaming a property fails it.
  - [ ] 7.5.2 Endpoints
    - **Source:** ADD §2.2 rows (tier R, kind R, profile A).
    - **Files:** Proposed `src/Kafka3O.UI.Server/Features/Clusters/ClusterInspectionEndpoints.cs` (create).
    - **Symbols:** `GET /api/v1/clusters/{clusterId}/cluster`, `/health/live`, `/health/ready`, `/cluster/health`.
    - **Implementation:** Each maps through `MapGatewayOperation`; responses transformed with `GatewayJsonTransformer`.
    - **Dependencies:** 7.5.1, 7.4.4.
    - **Completion Check:** `ClusterOverviewEndpointTests`: reader key used; emergency call writes ATTEMPT/RESULT; SSO user without `gateway.c1` -> 403 and zero Gateway requests; one fake Gateway failing does not affect another registration.

### Task 7.6: Overview page, cluster context, and health polling

- **Status:** Not Started
- **Source:** DES §3.2 (cluster context; late responses never update the new view), §3.5 P03/P04, §7 (unavailable, stale, credential failure states), TECH §8.6 (health polling every 30s, paused in hidden tabs, no activity renewal), FUNC §3.3, V8, V16
- **Outcome:** P04 shows independently permitted panels; P03 shows per-cluster health; state is bound to the cluster and late responses are discarded; polling pauses in hidden tabs and never renews activity.
- **Dependencies:** Task 7.5
- **Affected Files:** Proposed `src/Kafka3O.UI.Client/Features/Clusters/ClusterContext.cs`, `OverviewPage.razor`, `ClusterHealthBadge.razor`, `HealthPoller.cs`, `src/Kafka3O.UI.Client/wwwroot/js/visibility.js`, `src/Kafka3O.UI.Client/Features/Clusters/ClustersPage.razor`, `Layout/ApplicationShell.razor`, `tests/Kafka3O.UI.Client.Tests/Features/Clusters/*`, `tests/Kafka3O.UI.Browser.Tests/Clusters/OverviewTests.cs`, `tests/Kafka3O.UI.ExternalIntegration.Tests/Gateway/ClusterInspectionIntegrationTests.cs`
- **Manual Test Mapping:** Phase 7 steps 1-5, 7.
- **Subtasks:**
  - [ ] 7.6.1 Cluster-bound state
    - **Source:** DES §3.2, TECH §2.4, V16.
    - **Files:** Proposed `src/Kafka3O.UI.Client/Features/Clusters/ClusterContext.cs` (create).
    - **Symbols:** `ClusterContext.CurrentClusterId`, `Generation` (incremented on switch), `IsCurrent(int generation) -> bool`.
    - **Implementation:** Every request captures the generation; responses for an older generation are dropped; switching clears cluster-scoped caches.
    - **Dependencies:** 3.6.4.
    - **Completion Check:** bUnit `ClusterContextTests.LateResponseFromPreviousCluster_Ignored`.
  - [ ] 7.6.2 Health poller
    - **Source:** TECH §8.6 visible health polling row; FUNC §3.1 item 6; DES §8.2 (no announcement of every poll).
    - **Files:** Proposed `src/Kafka3O.UI.Client/Features/Clusters/HealthPoller.cs`, `src/Kafka3O.UI.Client/wwwroot/js/visibility.js` (create).
    - **Symbols:** `HealthPoller.Start(clusterId, permissions)`, `Stop()`; JS module export `onVisibilityChange(dotNetRef)`.
    - **Implementation:** Poll C3 live/ready every 30s only while `document.visibilityState === "visible"` and the user has the sub-permissions; never calls `ActivityNotifier`; keeps the last successful observation with its time and marks it stale after a failure.
    - **Dependencies:** 7.6.1.
    - **Completion Check:** bUnit `HealthPollerTests` with a fake clock: hidden tab -> no calls; no activity requests.
  - [ ] 7.6.3 Overview and directory health
    - **Source:** DES §3.5 P03, P04 (panels hidden independently), §7 rows (Gateway/Kafka unavailable, stale observation), FUNC §2.4 (Gateway 401 is not logout).
    - **Files:** Proposed `src/Kafka3O.UI.Client/Features/Clusters/OverviewPage.razor`, `ClusterHealthBadge.razor` (create); `ClustersPage.razor`, `Layout/ApplicationShell.razor` (modify: selected-cluster navigation from permissions).
    - **Symbols:** `@page "/clusters/{ClusterId}"`.
    - **Implementation:** C1 summary with broker table; C3 liveness and readiness panels (Kafka and audit-sink health when supplied); C4 totals and affected-resource table; `UPSTREAM_CREDENTIAL_FAILURE` shows "Gateway credential failure" without signing out; `UPSTREAM_OPERATION_UNAVAILABLE` shows the "Unavailable operation" state.
    - **Dependencies:** 7.6.2.
    - **Completion Check:** Phase 7 steps 2-4, 7; bUnit `OverviewPageTests` for hidden panels and each error state.
  - [ ] 7.6.4 Browser and real-Gateway tests
    - **Source:** V8, V16, V19, TECH §4.4 (real Gateway tests only in explicitly selected suites).
    - **Files:** Proposed `tests/Kafka3O.UI.Browser.Tests/Clusters/OverviewTests.cs`, `tests/Kafka3O.UI.ExternalIntegration.Tests/Gateway/ClusterInspectionIntegrationTests.cs`, `tests/Kafka3O.UI.ExternalIntegration.Tests/Gateway/RealGatewayFixture.cs` (create).
    - **Symbols:** `Overview_OneGatewayDown_OtherUsable`, `Switch_LateResponseNotShown`; `[Trait("Category","ExternalGateway")] ClusterOverview_ReturnsKafkaClusterId`.
    - **Implementation:** Browser tests use two `FakeGatewayServer` instances (one delayed, one failing). Integration tests read Gateway registrations from `KAFKA3O_IT_CONFIG` and skip when absent.
    - **Dependencies:** 7.6.3.
    - **Completion Check:** Browser tests pass in Chromium; external suite skipped (not passed) without settings.

---

## Phase 8: Broker, storage, quorum, and reassignment inspection

- **Phase Status:** Not Started
- **Goal:** A permitted user inspects broker configuration, log-directory usage, KRaft quorum state and in-progress reassignments for a cluster.
- **Manual Test Plan:**
  1. Open `local` > Brokers. Expect `/clusters/local/brokers` with the broker inventory and a Storage section listing each broker's log directories and sizes.
  2. Enter a broker ID in the storage filter and apply. Expect only that broker's log directories.
  3. Click a broker. Expect `/clusters/local/brokers/{brokerId}` with a configuration table showing value, source, a Sensitive marker (sensitive values shown as "Redacted", never blank), and Read-only flags.
  4. Open Cluster Administration > Quorum. Expect the leader ID, epoch, voters, observers and replication lag. On a non-KRaft cluster, expect an explicit "Unsupported Kafka version" error, not an empty table.
  5. Open Cluster Administration > Reassignments. Expect "No reassignments in progress".
  6. In Audit History filter operation `gateway.c2`. Expect emergency ATTEMPT/RESULT events with target `brokerId`.

### Task 8.1: Inspection endpoints for C2, C6, C7, C8

- **Status:** Not Started
- **Source:** FUNC §2.5 rows C2, C6, C7, C8; ADD §2.2 rows `gateway.c2`, `gateway.c6`, `gateway.c7`, `gateway.c8`; FUNC §2.4 (sensitive values redacted), §3.5 (unsupported versions not empty success)
- **Outcome:** Four read endpoints with schema-conformant DTOs.
- **Dependencies:** Phase 7
- **Affected Files:** Proposed `src/Kafka3O.UI.Server/Features/Clusters/ClusterInspectionEndpoints.cs` (modify), `src/Kafka3O.UI.Contracts/Features/Clusters/BrokerContracts.cs`, `src/Kafka3O.UI.Contracts/Features/Clusters/ClusterAdminContracts.cs`, `tests/Kafka3O.UI.Server.Tests/Features/Clusters/BrokerInspectionEndpointTests.cs`, `tests/Kafka3O.UI.Server.Tests/Contract/DtoSchemaConformanceTests.cs` (modify)
- **Manual Test Mapping:** Phase 8 steps 1-6.
- **Subtasks:**
  - [ ] 8.1.1 DTOs for broker and administration reads
    - **Source:** ADD §2.2 success schemas `DescribeBrokerConfigBody`, `QuorumBody`, `ListReassignmentsBody`, `LogDirsBody`; ADD §2.1.
    - **Files:** Proposed `src/Kafka3O.UI.Contracts/Features/Clusters/BrokerContracts.cs`, `ClusterAdminContracts.cs` (create); `tests/Kafka3O.UI.Server.Tests/Contract/DtoSchemaConformanceTests.cs` (modify).
    - **Symbols:** `DescribeBrokerConfigDto`, `QuorumDto`, `ListReassignmentsDto`, `LogDirsDto` and nested records.
    - **Implementation:** Int64 sizes and lag as `Int64String`; conformance theory rows added.
    - **Dependencies:** 7.5.1.
    - **Completion Check:** Conformance theory passes for the four pairs.
  - [ ] 8.1.2 Endpoints
    - **Source:** ADD §2.2 rows (tier R, kind R, profile A); TECH §14.4 target `brokerId`.
    - **Files:** Proposed `src/Kafka3O.UI.Server/Features/Clusters/ClusterInspectionEndpoints.cs` (modify).
    - **Symbols:** `GET /api/v1/clusters/{clusterId}/cluster/brokers/{brokerId}/config`, `/cluster/quorum`, `/cluster/reassignments`, `/cluster/log-dirs` (optional broker filter query as in the pinned schema).
    - **Implementation:** `brokerId` validated as int32 before dispatch (400 otherwise); audit target carries `brokerId`.
    - **Dependencies:** 8.1.1.
    - **Completion Check:** `BrokerInspectionEndpointTests`: non-numeric broker ID -> 400 with zero Gateway requests; unsupported-version upstream error preserved as `UPSTREAM_REJECTED` with its code.

### Task 8.2: Broker, quorum, and reassignment pages

- **Status:** Not Started
- **Source:** DES §3.5 P05, P06, P20, P21 (read part), §5 rows C2, C6, C7, C8, §14.1 routes, §6.1, §7
- **Outcome:** P05 brokers and storage, P06 broker configuration (read), P20 quorum and the read part of P21.
- **Dependencies:** Task 8.1
- **Affected Files:** Proposed `src/Kafka3O.UI.Client/Features/Clusters/BrokersPage.razor`, `BrokerDetailPage.razor`, `QuorumPage.razor`, `ReassignmentsPage.razor`, `tests/Kafka3O.UI.Client.Tests/Features/Clusters/BrokerPagesTests.cs`, `tests/Kafka3O.UI.ExternalIntegration.Tests/Gateway/BrokerInspectionIntegrationTests.cs`
- **Manual Test Mapping:** Phase 8 steps 1-5.
- **Subtasks:**
  - [ ] 8.2.1 Brokers and storage page
    - **Source:** DES §3.5 P05 (C1 inventory; C8 usage with optional broker filter; C8-only users enter broker IDs without loading C1).
    - **Files:** Proposed `src/Kafka3O.UI.Client/Features/Clusters/BrokersPage.razor` (create).
    - **Symbols:** `@page "/clusters/{ClusterId}/brokers"`.
    - **Implementation:** Panels independently permission-gated; unauthorized data never fetched.
    - **Dependencies:** 8.1.2.
    - **Completion Check:** bUnit: C8-only permission shows the filter input and makes no C1 call.
  - [ ] 8.2.2 Broker detail page (read)
    - **Source:** DES §3.5 P06 (C2 source/sensitive/read-only markers), DES §6.1 (redacted settings are not blank defaults).
    - **Files:** Proposed `src/Kafka3O.UI.Client/Features/Clusters/BrokerDetailPage.razor` (create).
    - **Symbols:** `@page "/clusters/{ClusterId}/brokers/{BrokerId:int}"`.
    - **Implementation:** Sensitive values render "Redacted"; the C5 editor is added in Phase 17.
    - **Dependencies:** 8.1.2.
    - **Completion Check:** bUnit: sensitive entry renders "Redacted".
  - [ ] 8.2.3 Quorum and reassignment pages
    - **Source:** DES §3.5 P20 (refresh; unsupported-version errors explicit), P21 (C7 inspection), DES §3.3 (Cluster Administration group).
    - **Files:** Proposed `src/Kafka3O.UI.Client/Features/Clusters/QuorumPage.razor`, `ReassignmentsPage.razor` (create); `Layout/ApplicationShell.razor` (modify: Cluster Administration group).
    - **Symbols:** `@page "/clusters/{ClusterId}/admin/quorum"`, `@page "/clusters/{ClusterId}/admin/reassignments"`.
    - **Implementation:** Explicit refresh button; empty state for no reassignments; C9 actions added in Phase 17.
    - **Dependencies:** 8.1.2.
    - **Completion Check:** bUnit `BrokerPagesTests` for empty and unsupported-version states.
  - [ ] 8.2.4 Real-Gateway inspection tests
    - **Source:** V19.
    - **Files:** Proposed `tests/Kafka3O.UI.ExternalIntegration.Tests/Gateway/BrokerInspectionIntegrationTests.cs` (create).
    - **Symbols:** `[Trait("Category","ExternalGateway")]` tests for C2, C6, C7, C8.
    - **Implementation:** Assert non-empty broker config and log directories; quorum either returns data or a classified unsupported-version error.
    - **Dependencies:** 8.2.3.
    - **Completion Check:** Skipped (not verified) without settings; passes against the local Gateway.

---

## Phase 9: Create and browse topics

- **Phase Status:** Not Started
- **Goal:** A permitted user lists topics, opens topic details, and creates one or many topics with validate-only preview, durable attempt/result auditing, and truthful 201/207/validation outcomes.
- **Manual Test Plan:**
  1. Open `local` > Topics. Expect a paginated topic table with a name-pattern filter and an "Include internal topics" toggle.
  2. Click "Create topic", enter name `ui-demo`, partitions `3`, replication factor `1`, configuration `retention.ms` = `86400000`, and click "Validate only". Expect "Validation succeeded"; refresh the topic list and expect no `ui-demo`.
  3. Click "Create topic". Expect a Succeeded result naming `ui-demo` with a correlation ID; the topic list shows `ui-demo` with 3 partitions.
  4. Open `ui-demo`. Expect `/clusters/local/topics/ui-demo` listing each partition's leader, replicas, ISR, begin and end offsets (as exact integers), message counts labelled "approximate", and configuration entries with their sources.
  5. Open "Bulk create topics" and enter `ui-bulk-1` (3 partitions, RF 1) and `bad name!` (1, 1). Submit. Expect every validation error listed with its item index and a "Nothing was created" message; `ui-bulk-1` does not appear in the topic list.
  6. Submit `ui-bulk-1` and `ui-demo`. Expect a Partially succeeded result: totals (1 ok, 1 failed), `ui-bulk-1` created, `ui-demo` failed with its Gateway code.
  7. In Audit History filter operation `gateway.t5`. Expect a `dryRun=true` ATTEMPT/RESULT pair for step 2 and a `succeeded` pair for step 3; filter `gateway.t6` and expect a `partial` RESULT for step 6.

### Task 9.1: Topic list and detail endpoints (T1, T2)

- **Status:** Not Started
- **Source:** FUNC §2.5 rows T1, T2; FUNC §2.4 (pagination `{items, page}`, default 50, max 500); ADD §2.2 rows `gateway.t1`, `gateway.t2`; TECH §10.3 (Gateway lists keep their contracts)
- **Outcome:** Topic list with pagination/filter/internal toggle and topic details, both with conformant DTOs.
- **Dependencies:** Phase 8
- **Affected Files:** Proposed `src/Kafka3O.UI.Server/Features/Topics/TopicEndpoints.cs`, `src/Kafka3O.UI.Contracts/Features/Topics/TopicReadContracts.cs`, `tests/Kafka3O.UI.Server.Tests/Features/Topics/TopicReadEndpointTests.cs`
- **Manual Test Mapping:** Phase 9 steps 1, 4.
- **Subtasks:**
  - [ ] 9.1.1 DTOs and query validation
    - **Source:** ADD §2.2 (`ListTopicsBody`, `DescribeTopicBody`), ADD §2.1 (query parameters from the pinned schema; unknown rejected).
    - **Files:** Proposed `src/Kafka3O.UI.Contracts/Features/Topics/TopicReadContracts.cs` (create); `tests/Kafka3O.UI.Server.Tests/Contract/DtoSchemaConformanceTests.cs` (modify).
    - **Symbols:** `ListTopicsDto`, `DescribeTopicDto` and nested partition/config records.
    - **Implementation:** Offsets and counts as `Int64String`; page parameters validated against Gateway baseline (size 1-500) before dispatch.
    - **Dependencies:** 7.5.1.
    - **Completion Check:** Conformance rows pass; `pageSize=501` -> 400 without dispatch.
  - [ ] 9.1.2 Endpoints
    - **Source:** ADD §2.2 rows (tier R, kind R, profile A).
    - **Files:** Proposed `src/Kafka3O.UI.Server/Features/Topics/TopicEndpoints.cs` (create).
    - **Symbols:** `GET /api/v1/clusters/{clusterId}/topics`, `GET /api/v1/clusters/{clusterId}/topics/{name}`.
    - **Implementation:** Topic name path parameter encoded once; audit target `name`.
    - **Dependencies:** 9.1.1.
    - **Completion Check:** `TopicReadEndpointTests`: large end offset `9007199254740993` returned as the exact string; missing topic -> `UPSTREAM_REJECTED` with `NOT_FOUND`.

### Task 9.2: Topic creation endpoints (T5, T6)

- **Status:** Not Started
- **Source:** FUNC §2.5 rows T5, T6; FUNC §3.5 (bulk validation shows all item errors; partial execution without rollback claims), §2.4 (207 mixed outcome); ADD §2.2 rows `gateway.t5`, `gateway.t6` (tier W, kind W, profile B), ADD §2.3 (T5/T6 not in the confirmation-bearing set; expose supported preview behavior), ADD §3.4 (`fieldErrors`), TECH §7.4
- **Outcome:** Create and bulk-create with validate-only support, attempt/result auditing, preserved 201/207, and item-indexed validation errors.
- **Dependencies:** Task 9.1
- **Affected Files:** Proposed `src/Kafka3O.UI.Server/Features/Topics/TopicEndpoints.cs` (modify), `src/Kafka3O.UI.Server/Features/Topics/TopicCreateValidation.cs`, `src/Kafka3O.UI.Server/Infrastructure/Gateway/GatewayErrorClassifier.cs` (modify), `src/Kafka3O.UI.Contracts/Features/Topics/TopicCreateContracts.cs`, `tests/Kafka3O.UI.Server.Tests/Features/Topics/TopicCreateEndpointTests.cs`
- **Manual Test Mapping:** Phase 9 steps 2-3, 5-7.
- **Subtasks:**
  - [ ] 9.2.1 DTOs and local validation
    - **Source:** ADD §2.2 (`CreateTopicRequestBody`, `CreateTopicBody`, `CreateTopicsBulkRequestBody`, `CreateTopicsBulkBody`), ADD §3.1 (unknown properties rejected; required fields).
    - **Files:** Proposed `src/Kafka3O.UI.Contracts/Features/Topics/TopicCreateContracts.cs`, `src/Kafka3O.UI.Server/Features/Topics/TopicCreateValidation.cs` (create).
    - **Symbols:** `CreateTopicRequestDto`, `CreateTopicDto`, `CreateTopicsBulkRequestDto`, `CreateTopicsBulkDto`; `TopicCreateValidation.Validate(...) -> IReadOnlyList<FieldError>`.
    - **Implementation:** Structural validation only (types, required, schema bounds); Kafka naming and policy validation stays with the Gateway; bulk validation reports every item with `/topics/{index}/...` paths.
    - **Dependencies:** 9.1.1.
    - **Completion Check:** Conformance rows pass; `TopicCreateValidationTests` report two errors for two invalid items.
  - [ ] 9.2.2 Map Gateway item validation details to field errors
    - **Source:** FUNC §2.4 errors (relevant non-secret details), §3.5 bullet 3; ADD §3.4 (`fieldErrors` ≤100, no submitted values; no arbitrary details object).
    - **Files:** Proposed `src/Kafka3O.UI.Server/Infrastructure/Gateway/GatewayErrorClassifier.cs` (modify).
    - **Symbols:** `GatewayErrorClassifier.ExtractFieldErrors(JsonElement details) -> IReadOnlyList<FieldError>`.
    - **Implementation:** When a Gateway validation error carries per-item details, translate each to a `FieldError` with index-preserving path and code; values are never copied; cap at 100.
    - **Dependencies:** 7.2.3.
    - **Completion Check:** `GatewayErrorClassifierTests.BulkValidationDetails_BecomeIndexedFieldErrors` using a fixture captured from the Gateway response shape.
  - [ ] 9.2.3 Endpoints with profile B auditing
    - **Source:** ADD §2.2 rows; TECH §7.4 external mutation row; TECH §14.4 (T6 item count target); ADD §2.2 note (preserve 201 and 207).
    - **Files:** Proposed `src/Kafka3O.UI.Server/Features/Topics/TopicEndpoints.cs` (modify).
    - **Symbols:** `POST /api/v1/clusters/{clusterId}/topics`, `POST /api/v1/clusters/{clusterId}/batch/topics`.
    - **Implementation:** Validate-only requests record `dryRun=true`; RESULT outcome `succeeded`, `partial` (207), `failed`, or `unknown`; operator tier.
    - **Dependencies:** 9.2.1, 9.2.2.
    - **Completion Check:** `TopicCreateEndpointTests`: attempt failure -> 503 and zero requests; 201 passthrough; 207 with outcome `partial`; transport timeout -> 504 `unknown` with exactly one request and no retry; result-audit failure -> `recording_failed` with data preserved.

### Task 9.3: Topic pages and shared outcome components

- **Status:** Not Started
- **Source:** DES §3.5 P07-P10, §5 rows T1, T2, T5, T6, §6.1, §6.5, §7 (executing, succeeded, partially succeeded, failed, outcome unknown, result audit failed), §14.1, DES §9 (`BulkResultTable`)
- **Outcome:** Topic list, detail (T2 tab), create and bulk-create pages with a shared operation-result component covering every result state.
- **Dependencies:** Task 9.2
- **Affected Files:** Proposed `src/Kafka3O.UI.Client/Features/Topics/TopicsPage.razor`, `TopicDetailPage.razor`, `CreateTopicPage.razor`, `BulkCreateTopicsPage.razor`, `src/Kafka3O.UI.Client/Features/Shared/OperationResult.razor`, `BulkResultTable.razor`, `KeyValueEditor.razor`, `tests/Kafka3O.UI.Client.Tests/Features/Topics/*`, `tests/Kafka3O.UI.Client.Tests/Features/Shared/OperationResultTests.cs`, `tests/Kafka3O.UI.Browser.Tests/Topics/CreateTopicTests.cs`, `tests/Kafka3O.UI.ExternalIntegration.Tests/Gateway/TopicCreateIntegrationTests.cs`
- **Manual Test Mapping:** Phase 9 steps 1-6.
- **Subtasks:**
  - [ ] 9.3.1 Shared operation result and bulk table
    - **Source:** DES §7 state rows, §6.2 item 7 (persistent results with correlation; not only a toast), §6.5 (totals, per-item outcomes, no bulk retry), TECH §9.2 (persistent audit warning).
    - **Files:** Proposed `src/Kafka3O.UI.Client/Features/Shared/OperationResult.razor`, `BulkResultTable.razor` (create).
    - **Symbols:** `OperationResult` (parameters: `ApiResult`, target label); `BulkResultTable` (totals and item rows with index, target, status, code, message).
    - **Implementation:** Shows correlation ID; `recording_failed` adds a persistent audit warning; outcome `unknown` shows "Writes may have occurred" with no retry button.
    - **Dependencies:** 4.2.1.
    - **Completion Check:** bUnit `OperationResultTests` for each state including audit warning and unknown.
  - [ ] 9.3.2 Topics list and detail pages
    - **Source:** DES §3.5 P07 (filter, page, internal toggle; links only with destination permissions), P08 (T2 tab; counts labelled approximate).
    - **Files:** Proposed `src/Kafka3O.UI.Client/Features/Topics/TopicsPage.razor`, `TopicDetailPage.razor` (create); `Layout/ApplicationShell.razor` (modify: Topics navigation).
    - **Symbols:** `@page "/clusters/{ClusterId}/topics"`, `@page "/clusters/{ClusterId}/topics/{Topic}"`.
    - **Implementation:** Exact offsets rendered from strings in IBM Plex Mono; tabs for later phases hidden without permission.
    - **Dependencies:** 9.1.2, 9.3.1.
    - **Completion Check:** bUnit: approximate label present; T1-less user can open detail by URL.
  - [ ] 9.3.3 Create and bulk-create pages
    - **Source:** DES §3.5 P09, P10; DES §6.1 (labels, inline errors, error summary), §6.5.
    - **Files:** Proposed `src/Kafka3O.UI.Client/Features/Topics/CreateTopicPage.razor`, `BulkCreateTopicsPage.razor`, `src/Kafka3O.UI.Client/Features/Shared/KeyValueEditor.razor` (create).
    - **Symbols:** `@page "/clusters/{ClusterId}/create-topic"`, `@page "/clusters/{ClusterId}/bulk-create-topics"`.
    - **Implementation:** "Validate only" and "Create topic" actions; duplicate-submit prevention while executing; bulk rows editable with index labels.
    - **Dependencies:** 9.2.3, 9.3.1.
    - **Completion Check:** Phase 9 steps 2-6; bUnit shows error summary focused after rejection.
  - [ ] 9.3.4 Browser and real-Gateway tests
    - **Source:** V14, V19, V20.
    - **Files:** Proposed `tests/Kafka3O.UI.Browser.Tests/Topics/CreateTopicTests.cs`, `tests/Kafka3O.UI.ExternalIntegration.Tests/Gateway/TopicCreateIntegrationTests.cs` (create).
    - **Symbols:** `ValidateOnly_CreatesNothing`, `Bulk_Partial_ShowsTotals`; `[Trait("Category","ExternalGateway")] CreateTopic_VisibleInKafka` (topics prefixed `kafka3o-it-`, cleaned up through the Gateway by the fixture).
    - **Implementation:** Integration fixture only touches allowlisted `kafka3o-it-` resources.
    - **Dependencies:** 9.3.3.
    - **Completion Check:** Browser tests pass; integration test creates and cleans up its topic.

---

## Phase 10: Topic storage, counts, consumers, and throughput

- **Phase Status:** Not Started
- **Goal:** A permitted user sees topic sizes, offset-derived counts for a time window, consuming groups with lag, and a bounded throughput sample.
- **Manual Test Plan:**
  1. Open `ui-demo` > Storage. Expect per-partition sizes with replica and log-directory detail.
  2. Open Counts, enter a window from one hour ago to now (UTC shown), and submit. Expect per-partition and total counts labelled "offset-derived, approximate", with the time zone shown as UTC.
  3. Enter the same window as epoch milliseconds. Expect identical counts.
  4. Open Consumers. Expect "No consumer groups consume this topic".
  5. Open Overview > Throughput, choose `ui-demo`, duration `5` seconds, and run. Expect a result after about 5 seconds with the returned rates and an equivalent numeric table.
  6. Enter duration `61`. Expect a validation error "Maximum is 60 seconds" before any request (no new `gateway.c10` audit event).

### Task 10.1: Endpoints for T3, T4, G3, C10

- **Status:** Not Started
- **Source:** FUNC §2.5 rows T3, T4, G3, C10; FUNC §2.4 (time semantics), §2.6 (throughput 5s default, 60 max); ADD §2.2 rows; ADD §5 (throughput exceeding limits fails validation before dispatch); TECH §8.6 (sample deadline); TECH §14.2, §14.3 (`ThroughputSampleSeconds`)
- **Outcome:** Four read endpoints with bound and time validation.
- **Dependencies:** Phase 9
- **Affected Files:** Proposed `src/Kafka3O.UI.Server/Features/Topics/TopicEndpoints.cs` (modify), `src/Kafka3O.UI.Server/Features/Groups/GroupEndpoints.cs`, `src/Kafka3O.UI.Server/Features/Clusters/ClusterInspectionEndpoints.cs` (modify), `src/Kafka3O.UI.Server/Features/Clusters/BoundsValidator.cs`, `src/Kafka3O.UI.Contracts/Features/Topics/TopicMetricsContracts.cs`, `src/Kafka3O.UI.Contracts/Features/Groups/TopicConsumersContracts.cs`, `src/Kafka3O.UI.Contracts/Features/Clusters/ThroughputContracts.cs`, `tests/Kafka3O.UI.Server.Tests/Features/Topics/TopicMetricsEndpointTests.cs`, `tests/Kafka3O.UI.Server.Tests/Features/Clusters/BoundsValidatorTests.cs`
- **Manual Test Mapping:** Phase 10 steps 1-6.
- **Subtasks:**
  - [ ] 10.1.1 Per-cluster bounds validator
    - **Source:** TECH §14.2 bullet 3 (configured `Default`/`Max`; outside `[1, Max]` -> 400 before dispatch), §14.3 bounds row, §16.1.
    - **Files:** Proposed `src/Kafka3O.UI.Server/Features/Clusters/BoundsValidator.cs` (create).
    - **Symbols:** `BoundsValidator.Resolve(string gatewayId, string boundName, long? requested) -> Result<long>`.
    - **Implementation:** Returns the configured default when omitted; the resolved value is always sent explicitly to the Gateway.
    - **Dependencies:** 1.3.1.
    - **Completion Check:** `BoundsValidatorTests`: omitted -> default; `Max` accepted; `Max+1` and `0` -> field error.
  - [ ] 10.1.2 DTOs and endpoints
    - **Source:** ADD §2.2 (`TopicSizeBody`, `TopicCountBody`, `TopicConsumerGroupsBody`, `ThroughputBody`); FUNC §2.4 (ISO-8601 UTC and epoch-millisecond inputs).
    - **Files:** Proposed `src/Kafka3O.UI.Contracts/Features/Topics/TopicMetricsContracts.cs`, `src/Kafka3O.UI.Contracts/Features/Groups/TopicConsumersContracts.cs`, `src/Kafka3O.UI.Contracts/Features/Clusters/ThroughputContracts.cs`, `src/Kafka3O.UI.Server/Features/Groups/GroupEndpoints.cs` (create); `TopicEndpoints.cs`, `ClusterInspectionEndpoints.cs`, `DtoSchemaConformanceTests.cs` (modify).
    - **Symbols:** `GET .../topics/{name}/size`, `.../topics/{name}/count`, `.../topics/{name}/consumer-groups`, `.../cluster/throughput`.
    - **Implementation:** Time query values accepted only in the pinned schema's formats; throughput `seconds` resolved by `BoundsValidator` (`ThroughputSampleSeconds`) and the call deadline set to seconds + 10 (max 70).
    - **Dependencies:** 10.1.1, 9.1.1.
    - **Completion Check:** `TopicMetricsEndpointTests`: `seconds=61` -> 400 with zero requests and no audit event; valid request deadline equals seconds + 10.

### Task 10.2: Topic tabs and throughput panel

- **Status:** Not Started
- **Source:** DES §3.5 P04 (C10 panel), P08 (T3, T4, G3 tabs), §4.2 (throughput graphic has an equivalent numeric table; returned sample only), §5 rows T3, T4, G3, C10
- **Outcome:** Storage, Counts and Consumers tabs and the Overview throughput panel.
- **Dependencies:** Task 10.1
- **Affected Files:** Proposed `src/Kafka3O.UI.Client/Features/Topics/TopicStorageTab.razor`, `TopicCountsTab.razor`, `TopicConsumersTab.razor`, `src/Kafka3O.UI.Client/Features/Clusters/ThroughputPanel.razor`, `src/Kafka3O.UI.Client/Features/Shared/TimeInput.razor`, `tests/Kafka3O.UI.Client.Tests/Features/Topics/TopicTabsTests.cs`
- **Manual Test Mapping:** Phase 10 steps 1-6.
- **Subtasks:**
  - [ ] 10.2.1 Time input component
    - **Source:** FUNC §2.4 time row (ISO-8601 UTC and epoch milliseconds; display time zone clearly).
    - **Files:** Proposed `src/Kafka3O.UI.Client/Features/Shared/TimeInput.razor` (create).
    - **Symbols:** `TimeInput` with mode ISO/epoch and `Value` as string.
    - **Implementation:** Epoch values kept as strings (no JavaScript number conversion); UTC label always visible.
    - **Dependencies:** Phase 1 shell.
    - **Completion Check:** bUnit: epoch `9007199254740993` preserved exactly.
  - [ ] 10.2.2 Topic tabs and throughput panel
    - **Source:** DES §3.5 P04, P08; §4.2.
    - **Files:** Proposed `src/Kafka3O.UI.Client/Features/Topics/TopicStorageTab.razor`, `TopicCountsTab.razor`, `TopicConsumersTab.razor`, `src/Kafka3O.UI.Client/Features/Clusters/ThroughputPanel.razor` (create); `TopicDetailPage.razor`, `OverviewPage.razor` (modify).
    - **Symbols:** Tab components gated by T3, T4, G3; `ThroughputPanel` gated by C10.
    - **Implementation:** Counts labelled offset-derived and approximate; throughput shows returned rates plus a numeric table; client-side validation mirrors configured max but backend remains authoritative.
    - **Dependencies:** 10.1.2, 10.2.1.
    - **Completion Check:** bUnit `TopicTabsTests`: tabs hidden without permission; empty consumers state.

---

## Phase 11: Reviewed destructive changes: delete topic and topic configuration

- **Phase Status:** Not Started
- **Goal:** A permitted user previews and executes confirmation-bearing changes (topic deletion and topic configuration set/reset) through the reviewed destructive workflow, with preview invalidation, exact-target confirmation, distinct Gateway safety errors and preview auditing.
- **Manual Test Plan:**
  1. Open `ui-bulk-1` > "Delete topic" and click "Preview deletion". Expect a review dialog showing environment `dev`, cluster `local`, topic `ui-bulk-1`, the dry-run result, and a disabled "Delete topic" button; focus starts on the dialog heading.
  2. Type `ui-bulk-X`. Expect the button to stay disabled. Type `ui-bulk-1`. Expect it enabled. Click it. Expect a Succeeded result with correlation ID; `ui-bulk-1` disappears from the topic list.
  3. Open `ui-demo` > Configuration, set `retention.ms` to `3600000`, and click "Preview changes". Expect a before/after table.
  4. Change the value to `7200000`. Expect a "Preview is out of date" message and a disabled execute button. Preview again, type `ui-demo`, and apply. Expect Succeeded; the configuration tab shows `retention.ms` = `7200000` with a dynamic topic source.
  5. Reset `retention.ms`, preview, confirm with `ui-demo`, and apply. Expect the value to return to its default source.
  6. Restart the Gateway with `policy.disabled_operations: ["T7"]` and preview deleting `ui-demo`. Expect "Operation disabled by the Gateway (OPERATION_DISABLED)". Restore the Gateway policy.
  7. Restart the Gateway with `policy.read_only_mode: true` and preview a configuration change. Expect "Gateway is in read-only mode (READ_ONLY_MODE)". Restore.
  8. In Audit History filter operation `gateway.t7`. Expect a preview pair (dry run, outcome `previewed`) and an execution pair (outcome `succeeded`) for step 2.

### Task 11.1: Server rules for confirmation-bearing operations

- **Status:** Not Started
- **Source:** FUNC §2.6 bullets 4-7, §3.5 bullets 1-2, ADD §2.1 (profile C; D previews need the row's permission and operator tier), ADD §2.3 last paragraph (P6: preview `dryRun=true` with `confirm:""`; never send an empty execution confirmation or manufacture a plan token), TECH §12.1 P6, §7.4 (destructive preview row)
- **Outcome:** One validator enforces preview/execution confirmation rules for all 17 D operations; previews and executions are separately authorized and audited.
- **Dependencies:** Phase 10
- **Affected Files:** Proposed `src/Kafka3O.UI.Server/Features/Clusters/DestructiveRequestRules.cs`, `src/Kafka3O.UI.Server/Features/Clusters/GatewayOperationExecutor.cs` (modify), `tests/Kafka3O.UI.Server.Tests/Features/Clusters/DestructiveRequestRulesTests.cs`
- **Manual Test Mapping:** Phase 11 steps 1-2, 4, 8.
- **Subtasks:**
  - [ ] 11.1.1 Preview and execution confirmation rules
    - **Source:** ADD §2.3 last paragraph; FUNC §2.6 bullet 6 (backend never generates or refreshes plan tokens).
    - **Files:** Proposed `src/Kafka3O.UI.Server/Features/Clusters/DestructiveRequestRules.cs` (create).
    - **Symbols:** `DestructiveRequestRules.Validate(GatewayOperation op, JsonElement body) -> IReadOnlyList<FieldError>` returning `IsPreview`.
    - **Implementation:** For kind D: `dryRun=true` requires `confirm` exactly `""`; `dryRun=false` requires a non-empty `confirm` (exact target or the plan token supplied by the browser); the backend never alters `confirm`. Non-D operations ignore these rules.
    - **Dependencies:** 7.4.3.
    - **Completion Check:** `DestructiveRequestRulesTests`: execution with empty confirm -> 400 and zero requests; preview with non-empty confirm -> 400.
  - [ ] 11.1.2 Profile C auditing of previews
    - **Source:** TECH §7.4 row "Emergency read, destructive preview, lock override"; ADD §2.1 profile C; ADD §3.3 (preview RESULT is `previewed`, not success).
    - **Files:** Proposed `src/Kafka3O.UI.Server/Features/Clusters/GatewayOperationExecutor.cs` (modify).
    - **Symbols:** Audit branch for `AuditProfile.C`.
    - **Implementation:** Preview: ATTEMPT (`dryRun=true`) before forwarding, RESULT outcome `previewed` or classified failure; execution: standard ATTEMPT/RESULT; `CONFIRMATION_MISMATCH` preserved as `UPSTREAM_REJECTED` with that upstream code.
    - **Dependencies:** 11.1.1.
    - **Completion Check:** `GatewayOperationExecutorTests.Preview_AuditsPreviewed`; preview ATTEMPT failure -> zero requests.

### Task 11.2: Topic delete and configuration endpoints (T7, T9)

- **Status:** Not Started
- **Source:** FUNC §2.5 rows T7, T9; ADD §2.2 rows `gateway.t7` (DELETE with body), `gateway.t9` (PATCH); TECH §14.4 (confirmation target in audit)
- **Outcome:** Two confirmation-bearing endpoints with conformant DTOs.
- **Dependencies:** Task 11.1
- **Affected Files:** Proposed `src/Kafka3O.UI.Server/Features/Topics/TopicEndpoints.cs` (modify), `src/Kafka3O.UI.Contracts/Features/Topics/TopicChangeContracts.cs`, `tests/Kafka3O.UI.Server.Tests/Features/Topics/TopicDestructiveEndpointTests.cs`
- **Manual Test Mapping:** Phase 11 steps 1-7.
- **Subtasks:**
  - [ ] 11.2.1 DTOs
    - **Source:** ADD §2.2 (`DeleteTopicRequestBody`, `DeleteTopicBody`, `AlterConfigRequestBody`, `AlterConfigBody`).
    - **Files:** Proposed `src/Kafka3O.UI.Contracts/Features/Topics/TopicChangeContracts.cs` (create); `DtoSchemaConformanceTests.cs` (modify).
    - **Symbols:** `DeleteTopicRequestDto`, `DeleteTopicDto`, `AlterConfigRequestDto`, `AlterConfigDto`.
    - **Implementation:** Mirrors set/reset structure of the pinned schema.
    - **Dependencies:** 7.5.1.
    - **Completion Check:** Conformance rows pass.
  - [ ] 11.2.2 Endpoints
    - **Source:** ADD §2.2 rows (tier W, kind D, profile C).
    - **Files:** Proposed `src/Kafka3O.UI.Server/Features/Topics/TopicEndpoints.cs` (modify).
    - **Symbols:** `DELETE /api/v1/clusters/{clusterId}/topics/{name}`, `PATCH /api/v1/clusters/{clusterId}/topics/{name}/config`.
    - **Implementation:** Apply `DestructiveRequestRules`; audit target includes `name` and the confirmation target.
    - **Dependencies:** 11.2.1, 11.1.2.
    - **Completion Check:** `TopicDestructiveEndpointTests`: preview then execution produce two ATTEMPT/RESULT pairs; `OPERATION_DISABLED` and `READ_ONLY_MODE` preserved as upstream codes; SSO user with T2 but not T7 -> 403 on preview.

### Task 11.3: Destructive review workflow in the client

- **Status:** Not Started
- **Source:** DES §6.2 steps 1-7 and paragraph after, §6.1 (never abbreviate targets), §8.2 (dialog initial focus on a safe element; Escape rules), §7 (awaiting confirmation, executing), FUNC §3.4 (state machine), §3.5, V10, V11
- **Outcome:** A reusable review workflow (dialog for single targets, review surface for bulk plans) that binds confirmation to an unchanged plan, invalidates on input change, and shows distinct safety errors; used for T7 and T9.
- **Dependencies:** Task 11.2
- **Affected Files:** Proposed `src/Kafka3O.UI.Client/Features/Shared/OperationReview.razor`, `OperationReviewState.cs`, `ReviewDialog.razor`, `SafetyErrorMessages.cs`, `src/Kafka3O.UI.Client/Features/Topics/DeleteTopicAction.razor`, `TopicConfigTab.razor`, `tests/Kafka3O.UI.Client.Tests/Features/Shared/OperationReviewTests.cs`, `tests/Kafka3O.UI.Browser.Tests/Topics/DestructiveWorkflowTests.cs`, `tests/Kafka3O.UI.ExternalIntegration.Tests/Gateway/TopicDestructiveIntegrationTests.cs`
- **Manual Test Mapping:** Phase 11 steps 1-7.
- **Subtasks:**
  - [ ] 11.3.1 Review state machine
    - **Source:** FUNC §3.4 (`idle -> validating -> previewing -> awaiting confirmation -> executing -> succeeded | partially succeeded | failed | outcome unknown`; input change invalidates preview; session/permission loss stops workflow), FUNC §3.5 bullet 2 (`CONFIRMATION_MISMATCH` shows fresh plan and requires renewed confirmation).
    - **Files:** Proposed `src/Kafka3O.UI.Client/Features/Shared/OperationReviewState.cs` (create).
    - **Symbols:** `OperationReviewState<TInput>` with `State`, `DraftFingerprint`, `Plan`, `ConfirmationSatisfied`, methods `InputChanged(TInput)`, `PreviewAsync()`, `ExecuteAsync(string confirmation)`.
    - **Implementation:** Fingerprint of inputs taken at preview; any change resets to `idle` and clears the plan; plan-token operations bind the token from the reviewed preview response; `CONFIRMATION_MISMATCH` stores the fresh plan and clears confirmation; no automatic re-execution after login.
    - **Dependencies:** 3.6.1.
    - **Completion Check:** bUnit `OperationReviewTests`: input change clears plan; mismatch requires new confirmation; execute disabled until exact target typed.
  - [ ] 11.3.2 Review dialog and surface components
    - **Source:** DES §6.2 (dialog for small single-target plans; review surface for bulk/complex), §8.2 (focus on safe heading; execution state available after closing), §7 rows.
    - **Files:** Proposed `src/Kafka3O.UI.Client/Features/Shared/OperationReview.razor`, `ReviewDialog.razor`, `SafetyErrorMessages.cs` (create).
    - **Symbols:** `OperationReview` (shows environment, cluster, full target(s), effects, dry-run result, warnings, confirmation field); `SafetyErrorMessages.Describe(upstreamCode) -> string` covering `READ_ONLY_MODE`, `OPERATION_DISABLED`, `DATA_PLANE_LOCKED`, `TIER_FORBIDDEN`, `GROUP_ACTIVE`, `REASSIGNMENT_IN_PROGRESS`, `CONFIRMATION_MISMATCH`.
    - **Implementation:** Destructive button uses danger styling and action-specific label; duplicate submission prevented while executing; closing does not imply cancellation.
    - **Dependencies:** 11.3.1, 9.3.1.
    - **Completion Check:** bUnit: initial focus on heading; each safety code yields a distinct message.
  - [ ] 11.3.3 Delete topic action and configuration tab
    - **Source:** DES §3.5 P08 (T7 delete; T9 set/reset with before/after), §5 rows T7, T9.
    - **Files:** Proposed `src/Kafka3O.UI.Client/Features/Topics/DeleteTopicAction.razor`, `TopicConfigTab.razor` (create); `TopicDetailPage.razor` (modify).
    - **Symbols:** Actions gated by `gateway.t7` and `gateway.t9`.
    - **Implementation:** Confirmation requires the exact topic name; T9 distinguishes set and reset rows.
    - **Dependencies:** 11.3.2.
    - **Completion Check:** Phase 11 steps 1-5.
  - [ ] 11.3.4 Browser and real-Gateway tests
    - **Source:** V10, V11, V19.
    - **Files:** Proposed `tests/Kafka3O.UI.Browser.Tests/Topics/DestructiveWorkflowTests.cs`, `tests/Kafka3O.UI.ExternalIntegration.Tests/Gateway/TopicDestructiveIntegrationTests.cs` (create).
    - **Symbols:** `Delete_RequiresExactName`, `InputChange_InvalidatesPreview`, `SafetyErrors_AreDistinct`; `[Trait("Category","ExternalGateway")] DeleteTopic_PreviewMakesNoChange_ExecutionDeletes`.
    - **Implementation:** Fake Gateway returns scripted safety errors for the browser test; the integration test verifies the topic still exists after preview and is gone after execution.
    - **Dependencies:** 11.3.3.
    - **Completion Check:** Named tests pass (external suite skipped without settings).

---

## Phase 12: Produce, upload, and tombstone records with request-scoped lock override

- **Phase Status:** Not Started
- **Goal:** A permitted user produces single or multiple records with exact encodings and repeated headers, uploads JSON/NDJSON files with validate-all semantics and size limits, produces tombstones, and overrides a data-plane lock for exactly one request with a reason.
- **Manual Test Plan:**
  1. Open `ui-demo` > "Produce records" (`/clusters/local/produce?topic=ui-demo`). Add one record: key `k1` (string), value `{"a":1}` (JSON), headers `trace`=`t1` and `trace`=`t2`, partition `0`. Click "Produce records". Expect a result row with partition `0` and an exact offset.
  2. Add two records in one submission: value `aGVsbG8=` (base64) with timestamp `1700000000000`, and value `plain` (string). Expect two item outcomes with partitions and offsets.
  3. Enter a base64 value `!!!`. Expect a field error before sending and no new `gateway.m5` audit event.
  4. Open "Upload records" and choose a file `ui-records.ndjson` containing three valid records and one blank line. Expect "3 records, NDJSON, <size> bytes, valid". Upload. Expect three per-record outcomes.
  5. Upload an NDJSON file whose second non-blank line is malformed. Expect "Line 2 is invalid" and "Nothing was produced"; the `ui-demo` end offsets are unchanged.
  6. Choose a file of 10,000,001 bytes. Expect "File is larger than 10,000,000 bytes" and no upload.
  7. Open "Produce tombstone" with key `k1`, partition `0`. Expect the value shown as "null (tombstone)" and, after producing, a partition and offset.
  8. Restart the Gateway with `policy.data_plane_lock: true` and produce a record. Expect "Data plane is locked (DATA_PLANE_LOCKED)" and an "Override lock for this request" option. Enter reason `incident-42` and produce. Expect Succeeded. Produce again without a reason. Expect the lock error again. In Audit History the successful event shows override reason `incident-42`. Restore the Gateway policy.
  9. Enter an override reason of 513 bytes. Expect a validation error.

### Task 12.1: Message write DTOs and backend validation

- **Status:** Not Started
- **Source:** ADD §2.3 (M5 `ProduceItemOrArray`, M6 `ProduceUpload`, M7 `TombstoneItem`), ADD §3.1 (int32 partition; decimal-string `timestampMs`), FUNC §2.4 records row, V13, V14
- **Outcome:** Typed M5/M7 inputs and a lossless M6 upload parser validate every item before any mutation.
- **Dependencies:** Phase 11
- **Affected Files:** Proposed `src/Kafka3O.UI.Contracts/Features/Messages/ProduceContracts.cs`, `src/Kafka3O.UI.Server/Features/Messages/ProduceValidation.cs`, `src/Kafka3O.UI.Server/Features/Messages/ProduceUploadParser.cs`, `tests/Kafka3O.UI.Server.Tests/Features/Messages/ProduceValidationTests.cs`, `ProduceUploadParserTests.cs`
- **Manual Test Mapping:** Phase 12 steps 1-7.
- **Subtasks:**
  - [ ] 12.1.1 Produce and tombstone DTOs with validation
    - **Source:** ADD §2.3 paragraphs 1 and 3 (value required string; optional key, encodings, int32 partition, decimal-string `timestampMs`, ordered headers; encodings `string|json|base64`, default string; json not reformatted; standard base64 validated; omitted key is the Gateway's empty key; tombstone has no value).
    - **Files:** Proposed `src/Kafka3O.UI.Contracts/Features/Messages/ProduceContracts.cs`, `src/Kafka3O.UI.Server/Features/Messages/ProduceValidation.cs` (create); `DtoSchemaConformanceTests.cs` (modify for `TombstoneItem`, `ProduceResponseBody`, `TombstoneResponseBody`).
    - **Symbols:** `ProduceItemDto`, `ProduceHeaderDto`, `ProduceResponseDto`, `TombstoneItemDto`, `TombstoneResponseDto`; `ProduceValidation.ValidateItems(IReadOnlyList<ProduceItemDto>) -> IReadOnlyList<FieldError>`.
    - **Implementation:** Single item or non-empty array accepted; base64 decoded strictly; `timestampMs` parsed with `Int64String`; header order preserved; errors carry `/items/{index}/...` paths.
    - **Dependencies:** 7.3.2.
    - **Completion Check:** `ProduceValidationTests`: invalid base64 rejected; empty array rejected; header order preserved into Gateway JSON; tombstone JSON has no `value`.
  - [ ] 12.1.2 Lossless upload parser
    - **Source:** ADD §2.3 paragraph 2 (JSON array or NDJSON; blank lines ignored; order retained; invalid line rejects whole upload; missing Content-Type = JSON array; charset parameter allowed; other types 415; raw numeric `timestampMs` parsed losslessly), ADD §5 upload row.
    - **Files:** Proposed `src/Kafka3O.UI.Server/Features/Messages/ProduceUploadParser.cs` (create).
    - **Symbols:** `ProduceUploadParser.ParseAsync(Stream body, string? contentType, CancellationToken) -> UploadParseResult` (items with original index or field errors).
    - **Implementation:** Read into a bounded pooled buffer (cap 10,000,000 bytes counted as streamed -> 413 `REQUEST_TOO_LARGE`); parse with `Utf8JsonReader`; numeric `timestampMs` tokens kept as raw digits; release the buffer on every exit.
    - **Dependencies:** 12.1.1.
    - **Completion Check:** `ProduceUploadParserTests`: NDJSON with blank line -> 3 items; malformed line 2 -> error at line 2 and no items; `text/csv` -> 415; numeric timestamp `9007199254740993` preserved; buffer returned to pool after cancellation.

### Task 12.2: Write endpoints with upload admission and override

- **Status:** Not Started
- **Source:** FUNC §2.5 rows M5, M6, M7; ADD §2.2 rows `gateway.m5`-`gateway.m7` (tier W, kind W, profile B); ADD §5 upload row (2 simultaneous buffered uploads, no queue, 429); FUNC §3.5 bullets 4-5 (override requires both permissions and a reason; not inherited); TECH §16.5 (S5); TECH §14.4 (M5/M6 item counts)
- **Outcome:** Produce, upload and tombstone endpoints that validate everything before mutation, limit concurrent uploads, and forward an override reason only for the authorized request.
- **Dependencies:** Task 12.1
- **Affected Files:** Proposed `src/Kafka3O.UI.Server/Features/Messages/MessageEndpoints.cs`, `src/Kafka3O.UI.Server/Features/Messages/UploadAdmission.cs`, `tests/Kafka3O.UI.Server.Tests/Features/Messages/ProduceEndpointTests.cs`, `LockOverrideTests.cs`
- **Manual Test Mapping:** Phase 12 steps 1-9.
- **Subtasks:**
  - [ ] 12.2.1 Upload admission
    - **Source:** ADD §5 upload row.
    - **Files:** Proposed `src/Kafka3O.UI.Server/Features/Messages/UploadAdmission.cs` (create).
    - **Symbols:** `UploadAdmission.TryEnter() -> IDisposable?` (capacity 2).
    - **Implementation:** Non-waiting; rejection -> 429 `THROTTLED` with `Retry-After: 1` before reading the body.
    - **Dependencies:** None.
    - **Completion Check:** `UploadAdmissionTests.ThirdConcurrentUpload_Rejected`.
  - [ ] 12.2.2 Produce, upload, and tombstone endpoints
    - **Source:** ADD §2.2 rows; ADD §2.3; TECH §7.4.
    - **Files:** Proposed `src/Kafka3O.UI.Server/Features/Messages/MessageEndpoints.cs` (create).
    - **Symbols:** `POST /api/v1/clusters/{clusterId}/topics/{name}/messages` (M5), `.../messages/bulk` (M6, JSON array or NDJSON), `.../tombstones` (M7).
    - **Implementation:** Validate all items (400, `not_started`) before the ATTEMPT; M6 forwards the validated items in the Gateway's accepted format with explicit Content-Type; audit target carries item counts; 207 preserved as `partial`.
    - **Dependencies:** 12.1.2, 12.2.1.
    - **Completion Check:** `ProduceEndpointTests`: malformed upload -> zero Gateway requests; 207 -> per-item results; ambiguous timeout -> `unknown` and one request.
  - [ ] 12.2.3 Request-scoped lock override
    - **Source:** FUNC §3.5 bullets 4-5, TECH §16.5, ADD §2.1 (M1-M7 lock; override needs `gateway.lock.override` and a reason on that single request), TECH §7.4 (override requires durable audit before forwarding).
    - **Files:** Proposed `src/Kafka3O.UI.Server/Features/Clusters/GatewayOperationExecutor.cs` (modify); `tests/Kafka3O.UI.Server.Tests/Features/Messages/LockOverrideTests.cs` (create).
    - **Symbols:** Executor forwards `X-Break-Glass-Reason` only when `OverrideReason` is present and both permissions are held; records `overrideReason` in ATTEMPT and RESULT.
    - **Implementation:** Missing override permission with a reason -> 403 and denial event; reason never stored outside audit; the next request carries no override unless it supplies its own reason.
    - **Dependencies:** 7.4.2, 12.2.2.
    - **Completion Check:** `LockOverrideTests`: reason without permission -> 403 and zero requests; with permission -> header forwarded once; following request has no header; override does not bypass `READ_ONLY_MODE` (upstream code preserved).

### Task 12.3: Produce, upload, and tombstone pages

- **Status:** Not Started
- **Source:** DES §3.5 P14-P16, §5 rows M5-M7, §6.1 (explicit data modes; tombstone not an empty string; ordered repeatable headers), §6.3 (override UI), §6.5 (file selection details; no browser persistence), DES §9 (`HeaderEditor`), DES §14.1
- **Outcome:** Three pages sharing a header editor and an override prompt.
- **Dependencies:** Task 12.2
- **Affected Files:** Proposed `src/Kafka3O.UI.Client/Features/Messages/ProducePage.razor`, `UploadRecordsPage.razor`, `TombstonePage.razor`, `src/Kafka3O.UI.Client/Features/Shared/HeaderEditor.razor`, `LockOverridePrompt.razor`, `tests/Kafka3O.UI.Client.Tests/Features/Messages/ProducePageTests.cs`, `tests/Kafka3O.UI.Browser.Tests/Messages/ProduceTests.cs`, `tests/Kafka3O.UI.ExternalIntegration.Tests/Gateway/ProduceIntegrationTests.cs`
- **Manual Test Mapping:** Phase 12 steps 1-9.
- **Subtasks:**
  - [ ] 12.3.1 Header editor and override prompt
    - **Source:** DES §6.1 bullet 7, §6.3 (both permissions; non-empty reason; 512-byte and control-character rules; shows which request receives the override).
    - **Files:** Proposed `src/Kafka3O.UI.Client/Features/Shared/HeaderEditor.razor`, `LockOverridePrompt.razor` (create).
    - **Symbols:** `HeaderEditor` (ordered rows key/value/encoding; duplicates allowed); `LockOverridePrompt` (shown on `DATA_PLANE_LOCKED` when the user has both permissions; returns a reason for one retry request).
    - **Implementation:** Byte length computed in UTF-8; prompt clears after the request completes; the user explicitly re-submits (not an automatic retry).
    - **Dependencies:** 3.6.1.
    - **Completion Check:** bUnit: 513-byte reason rejected; prompt hidden without `gateway.lock.override`.
  - [ ] 12.3.2 Produce, upload, and tombstone pages
    - **Source:** DES §3.5 P14 (compose one/multiple records), P15 (file inspection, per-record outcomes; no M5 prerequisite), P16 (explicit null value); DES §6.5; DES §9 browser state rules.
    - **Files:** Proposed `src/Kafka3O.UI.Client/Features/Messages/ProducePage.razor`, `UploadRecordsPage.razor`, `TombstonePage.razor` (create); `Layout/ApplicationShell.razor` (modify: Messages navigation).
    - **Symbols:** `@page "/clusters/{ClusterId}/produce"`, `@page "/clusters/{ClusterId}/upload-records"`, `@page "/clusters/{ClusterId}/tombstone"` (optional `topic` query).
    - **Implementation:** Timestamps and offsets kept as strings; the upload page shows filename, byte size, format and client-side pre-check, sends the file with explicit Content-Type, and never stores file contents in browser storage.
    - **Dependencies:** 12.3.1, 12.2.2.
    - **Completion Check:** bUnit `ProducePageTests`: repeated headers preserved in the request; tombstone request has no value field.
  - [ ] 12.3.3 Browser and real-Gateway tests
    - **Source:** V11, V13, V14, V19.
    - **Files:** Proposed `tests/Kafka3O.UI.Browser.Tests/Messages/ProduceTests.cs`, `tests/Kafka3O.UI.ExternalIntegration.Tests/Gateway/ProduceIntegrationTests.cs` (create).
    - **Symbols:** `Upload_MalformedLine_NothingProduced`, `Override_NotInherited`; `[Trait("Category","ExternalGateway")] Produce_RecordReadableViaM2` (verified in Phase 13 once M2 exists; until then assert assigned offset).
    - **Implementation:** Uses `kafka3o-it-` topics only.
    - **Dependencies:** 12.3.2.
    - **Completion Check:** Named tests pass.

---

## Phase 13: Bounded message inspection and exact-record deep links

- **Phase Status:** Not Started
- **Goal:** A permitted user browses, regex-searches and JSONPath-filters one explicit partition between explicit offsets in one bounded request, sees truthful scan information without continuation, opens exact-record deep links, and cannot submit unsupported selections.
- **Manual Test Plan:**
  1. Open `/clusters/local/messages?topic=ui-demo`, choose Browse, leave Partition empty and submit. Expect "Partition is required" and no request.
  2. Enter partition `0`, start offset `0`, end offset `10`, limit `100`, and submit. Expect records in Gateway order with exact offsets, UTC timestamps, key and value encodings, both `trace` headers, and the tombstone shown as "null (tombstone)"; a scan summary shows scanned, matched, skipped, bytes, elapsed ms, reached end and stopped by; there is no "Next" or "Load more" control.
  3. Produce a record with value `<img src=x onerror=alert(1)>` (Phase 12) and browse again. Expect it rendered as literal text and no alert dialog.
  4. Choose Regex, fields Value, expression `a`, and submit. Expect matches and a skipped count. Enter expression `(`. Expect a validation error from the Gateway shown on the form.
  5. Choose Structured, path `$.a`, operator `eq`, value `1`. Expect the matching JSON record. The operator list shows exactly `eq`, `neq`, `contains`, `regex`, `exists`, `gt`, `lt`, `gte`, `lte`.
  6. Browse start `100000`, end `100010`. Expect "No records returned" with the notice "This does not prove the range is empty" and the Gateway stop information.
  7. Click a record's offset. Expect `/clusters/local/topics/ui-demo/partitions/0/offsets/<offset>` showing the full record. Change the offset in the URL to `999999`. Expect "Record not found (missing or compacted)".
  8. Run `curl -i -b "__Host-Kafka3O.Session=$S" "http://localhost:8080/api/v1/clusters/local/topics/ui-demo/messages?partition=0&from=beginning"`. Expect `400` `VALIDATION_FAILED`, `Cache-Control: no-store`, and no request in the Gateway log. Repeat with `from=offset:0&to=offset:5` and no `partition`. Expect `400`.
  9. With `policy.data_plane_lock: true` on the Gateway, browse. Expect `DATA_PLANE_LOCKED` and the override prompt; with reason `incident-43` the browse succeeds once. Restore the policy.

### Task 13.1: Message read endpoints with reduced-v1 selection rules

- **Status:** Not Started
- **Source:** FUNC §1.5, §2.5 rows M1-M4, §3.6, TECH §13.1, §13.3, ADD §11.2 (exactly one partition; `from` and `to` offset selections; other modes -> 400 before dispatch; preserve order and scan fields; no cursor reuse), ADD §2.2 rows `gateway.m1`-`gateway.m4`, TECH §14.2 bounds, ADD §5 (no-store; bounded response handling), V12
- **Outcome:** M1/M3/M4 accept only single-partition explicit-offset requests with configured bounds; M2 fetches an exact record; responses are no-store and bounded.
- **Dependencies:** Phase 12
- **Affected Files:** Proposed `src/Kafka3O.UI.Server/Features/Messages/MessageSelectionValidator.cs`, `src/Kafka3O.UI.Server/Features/Messages/MessageEndpoints.cs` (modify), `src/Kafka3O.UI.Contracts/Features/Messages/MessageReadContracts.cs`, `tests/Kafka3O.UI.Server.Tests/Features/Messages/MessageSelectionValidatorTests.cs`, `MessageReadEndpointTests.cs`
- **Manual Test Mapping:** Phase 13 steps 1-9.
- **Subtasks:**
  - [ ] 13.1.1 Selection validator
    - **Source:** ADD §11.2 bullet 1; pinned schema (M1 query `partition` integer, `from` required string, `to` string; `SearchBody`/`FilterBody` with `partition`, `from`, `to`).
    - **Files:** Proposed `src/Kafka3O.UI.Server/Features/Messages/MessageSelectionValidator.cs` (create).
    - **Symbols:** `MessageSelectionValidator.Validate(int? partition, string? from, string? to) -> IReadOnlyList<FieldError>`.
    - **Implementation:** Require `partition` (non-negative int32) and both `from` and `to` in the form `offset:<Int64String nonnegative>`; reject `beginning`, `latest`, `timestamp:*`, missing values, and multiple/all partition forms; never rewrite a mode or pick a partition.
    - **Dependencies:** 7.3.2.
    - **Completion Check:** `MessageSelectionValidatorTests` theory over each rejected form; `offset:9223372036854775807` accepted.
  - [ ] 13.1.2 Read DTOs and bound resolution
    - **Source:** ADD §2.2 (`ReadMessagesBody`, `RecordDTO`, `SearchBody`, `FilterBody`), FUNC §2.6 (M1 `limit`; M3/M4 `maxScan`, `maxMatches`), TECH §14.2, §14.3 bounds, FUNC §3.6 (M4 operators).
    - **Files:** Proposed `src/Kafka3O.UI.Contracts/Features/Messages/MessageReadContracts.cs` (create); `DtoSchemaConformanceTests.cs` (modify).
    - **Symbols:** `ReadMessagesDto`, `RecordDto`, `ScanInfoDto`, `SearchRequestDto`, `FilterRequestDto`.
    - **Implementation:** Each bound field (`limit`, `maxScan`, `maxMatches`, `maxBytes`, `maxTimeMs`) resolved with `BoundsValidator` and sent explicitly; record keys, values and headers pass through untouched with their encodings; offsets and cursors as `Int64String`.
    - **Dependencies:** 13.1.1, 10.1.1.
    - **Completion Check:** Conformance rows pass; omitted `maxScan` sends the configured default.
  - [ ] 13.1.3 Endpoints
    - **Source:** ADD §2.2 rows (tier R, kind R, profile A; M3/M4 are read-only POSTs), ADD §11.2 bullets 2-5, ADD §5 (`Cache-Control: no-store` for message responses; no payload cache), TECH §14.4 (target `partition`, `from`, `to`; never regex/JSONPath values), TECH §14.2 (M2 JSON `NOT_FOUND` = missing record).
    - **Files:** Proposed `src/Kafka3O.UI.Server/Features/Messages/MessageEndpoints.cs` (modify).
    - **Symbols:** `GET .../topics/{name}/messages` (M1), `GET .../topics/{name}/partitions/{partition}/messages/{offset}` (M2), `POST .../topics/{name}/messages/search` (M3), `POST .../topics/{name}/messages/filter` (M4).
    - **Implementation:** Validation before audit and dispatch; one Gateway call per submission; response buffers released after writing; no-store headers; override supported (Task 12.2.3).
    - **Dependencies:** 13.1.2.
    - **Completion Check:** `MessageReadEndpointTests`: each unsupported selection -> 400 and zero Gateway requests (including emergency identity); valid request -> exactly one Gateway request with explicit bounds; `reachedEnd`/`stoppedBy` preserved; M3 audit target excludes the regex.

### Task 13.2: Messages page and record detail

- **Status:** Not Started
- **Source:** DES §3.5 P12, P13, §5 rows M1-M4, M2, §6.4 (modes; scan statistics; inert payload rendering; no continuation or latest mode; incomplete scans not labelled complete), §3.2 (deep links carry only resource identity and exact offsets), §14.1, DES §9 (`RecordInspector`), FUNC §3.3 (cluster switching), V12, V13, V16
- **Outcome:** Browse/Regex/Structured modes with a shared bounded result layout and an exact-record deep-link page.
- **Dependencies:** Task 13.1
- **Affected Files:** Proposed `src/Kafka3O.UI.Client/Features/Messages/MessagesPage.razor`, `MessageSelectionForm.razor`, `ScanResultView.razor`, `RecordDetailPage.razor`, `src/Kafka3O.UI.Client/Features/Shared/RecordInspector.razor`, `tests/Kafka3O.UI.Client.Tests/Features/Messages/MessagesPageTests.cs`, `tests/Kafka3O.UI.Browser.Tests/Messages/MessageInspectionTests.cs`, `tests/Kafka3O.UI.ExternalIntegration.Tests/Gateway/MessageInspectionIntegrationTests.cs`
- **Manual Test Mapping:** Phase 13 steps 1-7, 9.
- **Subtasks:**
  - [ ] 13.2.1 Record inspector
    - **Source:** DES §6.1 bullet 7, §6.4 (inert text), FUNC §2.4 records row (JSON, string, base64 and null distinct; repeated headers not collapsed).
    - **Files:** Proposed `src/Kafka3O.UI.Client/Features/Shared/RecordInspector.razor` (create).
    - **Symbols:** `RecordInspector` (parameters `RecordDto`, `CompactMode`).
    - **Implementation:** Render values as text nodes only (no `MarkupString`); show encoding labels; null value -> "null (tombstone)"; headers listed in order.
    - **Dependencies:** 13.1.2.
    - **Completion Check:** bUnit: `<script>` value rendered escaped; duplicate header keys both shown.
  - [ ] 13.2.2 Messages page
    - **Source:** DES §3.5 P12 (M1/M3/M4 modes; explicit partition and offsets; no continuation), §6.4, FUNC §1.5 paragraph 5.
    - **Files:** Proposed `src/Kafka3O.UI.Client/Features/Messages/MessagesPage.razor`, `MessageSelectionForm.razor`, `ScanResultView.razor` (create).
    - **Symbols:** `@page "/clusters/{ClusterId}/messages"` (optional `topic` query).
    - **Implementation:** Modes offered per permission; required partition/start/end inputs as exact strings; scan summary always shows stop information; empty or timed-out results show "This does not prove the range is empty"; results are cluster-bound and discarded on switch; search expressions never placed in the URL.
    - **Dependencies:** 13.2.1, 7.6.1, 12.3.1.
    - **Completion Check:** bUnit `MessagesPageTests`: submit without partition blocked; no continuation control exists; switching cluster clears results.
  - [ ] 13.2.3 Record detail page
    - **Source:** DES §3.5 P13 (M2 required even from results; missing/compacted state), §14.1 deep-link route.
    - **Files:** Proposed `src/Kafka3O.UI.Client/Features/Messages/RecordDetailPage.razor` (create).
    - **Symbols:** `@page "/clusters/{ClusterId}/topics/{Topic}/partitions/{Partition:int}/offsets/{Offset}"`.
    - **Implementation:** `Offset` validated as `Int64String` in the client and server; authorized M7 users see "Produce tombstone for this key" linking to P16 with the key as draft input (no replay action).
    - **Dependencies:** 13.2.1.
    - **Completion Check:** Phase 13 step 7; bUnit: invalid offset text shows not-found without an API call.
  - [ ] 13.2.4 Browser and real-Gateway tests
    - **Source:** V12, V13, V16, V19, ADD §11.4 item 3 (dense, sparse/trailing-gap, nonmatching and skipped fixtures; real fixtures where fakes cannot model compaction).
    - **Files:** Proposed `tests/Kafka3O.UI.Browser.Tests/Messages/MessageInspectionTests.cs`, `tests/Kafka3O.UI.ExternalIntegration.Tests/Gateway/MessageInspectionIntegrationTests.cs` (create).
    - **Symbols:** `HtmlPayload_NotExecuted`, `ClusterSwitch_LateSearchResultDiscarded`, `EmptyRange_ShowsNoProofNotice`; `[Trait("Category","ExternalGateway")] Browse_ExplicitOffsets_ReturnsProducedRecords`, `Browse_CompactedTopic_ShowsGaps`.
    - **Implementation:** The compacted-topic test creates a `kafka3o-it-` topic with `cleanup.policy=compact` and asserts no completeness claim.
    - **Dependencies:** 13.2.3.
    - **Completion Check:** Named tests pass (external skipped without settings).

---

## Phase 14: Bulk delete, partition increase, truncate, and purge

- **Phase Status:** Not Started
- **Goal:** A permitted user runs the remaining topic destructive operations, including plan-token confirmation with changed-target detection.
- **Manual Test Plan:**
  1. Bulk-create `ui-tmp-1` and `ui-tmp-2`. Open "Bulk delete topics", enter pattern `ui-tmp-.*`, and click "Preview deletion". Expect a review surface listing `ui-tmp-1` and `ui-tmp-2` and showing the reviewed plan.
  2. In another tab, create `ui-tmp-3`. Return and confirm the deletion. Expect "The resolved topics changed" with a fresh plan listing three topics and the confirmation cleared. Confirm again. Expect per-topic results for all three.
  3. Open `ui-demo` > "Increase partitions", target `4`, and preview. Expect "from 3 to 4" and a warning that key-to-partition mapping changes irreversibly. Confirm with `ui-demo`. Expect 4 partitions in the topic detail.
  4. Open "Truncate records", select partition `0`, offset `2`, and preview. Expect the affected range for partition 0. Confirm with `ui-demo`. Browse partition 0 from offset `0` to `10`. Expect the first returned offset to be at least `2`.
  5. Open "Purge topic" and preview. Expect every partition listed. Confirm with `ui-demo`. Expect topic detail begin offsets equal to end offsets and the topic and its configuration still present.

### Task 14.1: Endpoints for T8, T10, T11, T12

- **Status:** Not Started
- **Source:** FUNC §2.5 rows T8, T10, T11, T12; FUNC §2.6 bullets 5-6 (plan tokens from dry-run; no substitute or silently refreshed tokens); ADD §2.2 rows (tier W, kind D, profile C); ADD §2.3; TECH §14.4 (T8 pattern and resolved count)
- **Outcome:** Four confirmation-bearing endpoints using the shared rules.
- **Dependencies:** Phase 13
- **Affected Files:** Proposed `src/Kafka3O.UI.Server/Features/Topics/TopicEndpoints.cs` (modify), `src/Kafka3O.UI.Contracts/Features/Topics/TopicDestructiveContracts.cs`, `tests/Kafka3O.UI.Server.Tests/Features/Topics/TopicDestructiveEndpointTests.cs` (modify)
- **Manual Test Mapping:** Phase 14 steps 1-5.
- **Subtasks:**
  - [ ] 14.1.1 DTOs
    - **Source:** ADD §2.2 (`BulkDeleteRequestBody`, `BulkDeleteBody`, `AddPartitionsRequestBody`, `AddPartitionsBody`, `DeleteRecordsRequestBody`, `DeleteRecordsBody`, `PurgeRequestBody`, `PurgeBody`).
    - **Files:** Proposed `src/Kafka3O.UI.Contracts/Features/Topics/TopicDestructiveContracts.cs` (create); `DtoSchemaConformanceTests.cs` (modify).
    - **Symbols:** Matching `*Dto` records.
    - **Implementation:** Truncation offsets as `Int64String`.
    - **Dependencies:** 7.5.1.
    - **Completion Check:** Conformance rows pass.
  - [ ] 14.1.2 Endpoints
    - **Source:** ADD §2.2 rows.
    - **Files:** Proposed `src/Kafka3O.UI.Server/Features/Topics/TopicEndpoints.cs` (modify).
    - **Symbols:** `POST .../batch/topics/delete`, `POST .../topics/{name}/partitions`, `POST .../topics/{name}/delete-records`, `POST .../topics/{name}/purge`.
    - **Implementation:** `DestructiveRequestRules` applied; plan token passed through exactly as supplied by the browser; `CONFIRMATION_MISMATCH` preserved.
    - **Dependencies:** 14.1.1, 11.1.2.
    - **Completion Check:** `TopicDestructiveEndpointTests`: T8 execution forwards the exact token; mismatch response preserved; truncation offset `9007199254740993` sent as an exact JSON number.

### Task 14.2: Bulk delete, partitions, truncate, and purge UI

- **Status:** Not Started
- **Source:** DES §3.5 P08 (T10, T11, T12), P11 (T8 list or pattern; resolved targets; plan-token review), §5 rows, §6.2 (review surface for bulk plans; bind reviewed token)
- **Outcome:** P11 and three topic actions using `OperationReview`.
- **Dependencies:** Task 14.1
- **Affected Files:** Proposed `src/Kafka3O.UI.Client/Features/Topics/BulkDeleteTopicsPage.razor`, `IncreasePartitionsAction.razor`, `TruncateRecordsAction.razor`, `PurgeTopicAction.razor`, `tests/Kafka3O.UI.Client.Tests/Features/Topics/BulkDeleteTopicsPageTests.cs`, `tests/Kafka3O.UI.Browser.Tests/Topics/BulkDeleteTests.cs`, `tests/Kafka3O.UI.ExternalIntegration.Tests/Gateway/TopicMaintenanceIntegrationTests.cs`
- **Manual Test Mapping:** Phase 14 steps 1-5.
- **Subtasks:**
  - [ ] 14.2.1 Bulk delete page
    - **Source:** DES §3.5 P11; FUNC §3.5 bullet 2.
    - **Files:** Proposed `src/Kafka3O.UI.Client/Features/Topics/BulkDeleteTopicsPage.razor` (create).
    - **Symbols:** `@page "/clusters/{ClusterId}/bulk-delete-topics"`.
    - **Implementation:** Explicit list or pattern (distinguished from page selection); review surface lists every resolved topic unabbreviated; the token from the reviewed preview is sent on execution; mismatch shows the fresh plan.
    - **Dependencies:** 14.1.2, 11.3.2.
    - **Completion Check:** bUnit `BulkDeleteTopicsPageTests`: mismatch clears confirmation and shows new targets.
  - [ ] 14.2.2 Partition, truncate, and purge actions
    - **Source:** DES §5 rows T10 (irreversible mapping warning), T11 (per-partition offset review), T12 (all-partition plan).
    - **Files:** Proposed `src/Kafka3O.UI.Client/Features/Topics/IncreasePartitionsAction.razor`, `TruncateRecordsAction.razor`, `PurgeTopicAction.razor` (create); `TopicDetailPage.razor` (modify).
    - **Symbols:** Actions gated by `gateway.t10`, `gateway.t11`, `gateway.t12`.
    - **Implementation:** Exact topic-name confirmation; offsets entered as strings.
    - **Dependencies:** 14.1.2, 11.3.2.
    - **Completion Check:** Phase 14 steps 3-5.
  - [ ] 14.2.3 Browser and real-Gateway tests
    - **Source:** V10, V19.
    - **Files:** Proposed `tests/Kafka3O.UI.Browser.Tests/Topics/BulkDeleteTests.cs`, `tests/Kafka3O.UI.ExternalIntegration.Tests/Gateway/TopicMaintenanceIntegrationTests.cs` (create).
    - **Symbols:** `ChangedTargets_RequireReconfirmation`; `[Trait("Category","ExternalGateway")] Truncate_AdvancesBeginOffset`, `Purge_KeepsTopic`.
    - **Implementation:** Integration tests on `kafka3o-it-` topics.
    - **Dependencies:** 14.2.2.
    - **Completion Check:** Named tests pass.

---

## Phase 15: Consumer groups and offset reset

- **Phase Status:** Not Started
- **Goal:** A permitted user lists and inspects consumer groups with lag, and resets or pre-seeds inactive group offsets through the reviewed workflow.
- **Manual Test Plan:**
  1. Run `kafka-console-consumer.sh --bootstrap-server <kafka> --topic ui-demo --group ui-demo-consumers --from-beginning` for a few seconds, then stop it.
  2. Open `local` > Consumer Groups. Expect `ui-demo-consumers` with state `Empty`, its protocol and 0 members; filter by state `Empty` keeps it listed.
  3. Open the group. Expect coordinator, members (none), committed offsets, end offsets, lag per partition and total lag.
  4. Open `ui-demo` > Consumers. Expect `ui-demo-consumers` with partition lag.
  5. On the group page choose "Reset offsets", strategy Earliest, topic `ui-demo`, and preview. Expect before/after offsets per partition. Confirm with `ui-demo-consumers`. Expect Succeeded and committed offsets at the earliest values.
  6. Choose "Reset offsets" for a new group `ui-seeded` with strategy Latest (pre-seed) and preview, then confirm with `ui-seeded`. Expect `ui-seeded` to appear in the group list.
  7. Start the console consumer again and try a reset on `ui-demo-consumers`. Expect "Group is active (GROUP_ACTIVE)". Stop the consumer.

### Task 15.1: Group endpoints for G1, G2, G4

- **Status:** Not Started
- **Source:** FUNC §2.5 rows G1, G2, G4; ADD §2.2 rows `gateway.g1`, `gateway.g2` (R), `gateway.g4` (W, D, C); FUNC §2.6 (group ID confirmation); FUNC §3.5 (`GROUP_ACTIVE`)
- **Outcome:** Group list, detail and reset/pre-seed endpoints.
- **Dependencies:** Phase 14
- **Affected Files:** Proposed `src/Kafka3O.UI.Server/Features/Groups/GroupEndpoints.cs` (modify), `src/Kafka3O.UI.Contracts/Features/Groups/GroupContracts.cs`, `tests/Kafka3O.UI.Server.Tests/Features/Groups/GroupEndpointTests.cs`
- **Manual Test Mapping:** Phase 15 steps 2-7.
- **Subtasks:**
  - [ ] 15.1.1 DTOs
    - **Source:** ADD §2.2 (`ListGroupsBody`, `DescribeGroupBody`, `ResetOffsetsRequestBody`, `ResetOffsetsBody`).
    - **Files:** Proposed `src/Kafka3O.UI.Contracts/Features/Groups/GroupContracts.cs` (create); `DtoSchemaConformanceTests.cs` (modify).
    - **Symbols:** `ListGroupsDto`, `DescribeGroupDto`, `ResetOffsetsRequestDto`, `ResetOffsetsDto`.
    - **Implementation:** Offsets, lag and timestamps as `Int64String`.
    - **Dependencies:** 7.5.1.
    - **Completion Check:** Conformance rows pass.
  - [ ] 15.1.2 Endpoints
    - **Source:** ADD §2.2 rows; TECH §14.4 (`groupId` target).
    - **Files:** Proposed `src/Kafka3O.UI.Server/Features/Groups/GroupEndpoints.cs` (modify).
    - **Symbols:** `GET .../consumer-groups`, `GET .../consumer-groups/{groupId}`, `POST .../consumer-groups/{groupId}/reset-offsets`.
    - **Implementation:** Group IDs encoded once as a path segment (may contain reserved characters); G4 uses `DestructiveRequestRules`.
    - **Dependencies:** 15.1.1, 11.1.2.
    - **Completion Check:** `GroupEndpointTests`: group ID `a/b c` encoded as `a%2Fb%20c`; `GROUP_ACTIVE` preserved; preview audited `previewed`.

### Task 15.2: Consumer group pages and reset action

- **Status:** Not Started
- **Source:** DES §3.5 P18, P19 (G2 panels; G4 inputs, preview, group confirmation), §5 rows G1, G2, G4, §14.1 (`/consumer-groups`, `/consumer-group?groupId=`)
- **Outcome:** Group list and detail pages with the reset/pre-seed action.
- **Dependencies:** Task 15.1
- **Affected Files:** Proposed `src/Kafka3O.UI.Client/Features/Groups/ConsumerGroupsPage.razor`, `ConsumerGroupPage.razor`, `ResetOffsetsAction.razor`, `tests/Kafka3O.UI.Client.Tests/Features/Groups/ConsumerGroupPagesTests.cs`, `tests/Kafka3O.UI.ExternalIntegration.Tests/Gateway/GroupIntegrationTests.cs`
- **Manual Test Mapping:** Phase 15 steps 2-7.
- **Subtasks:**
  - [ ] 15.2.1 List and detail pages
    - **Source:** DES §3.5 P18 (page/filter by state), P19 (read panels need G2).
    - **Files:** Proposed `src/Kafka3O.UI.Client/Features/Groups/ConsumerGroupsPage.razor`, `ConsumerGroupPage.razor` (create); `Layout/ApplicationShell.razor` (modify: Consumer Groups navigation).
    - **Symbols:** `@page "/clusters/{ClusterId}/consumer-groups"`, `@page "/clusters/{ClusterId}/consumer-group"` with `[SupplyParameterFromQuery] GroupId`.
    - **Implementation:** Mutation-only users can open P19 with an explicit group ID without loading G2.
    - **Dependencies:** 15.1.2.
    - **Completion Check:** bUnit: G4-only user sees the reset action and no read panels.
  - [ ] 15.2.2 Reset and pre-seed action
    - **Source:** FUNC §2.5 G4 (earliest/latest/specific offset/timestamp; preview before/after; confirm group ID), DES §6.2.
    - **Files:** Proposed `src/Kafka3O.UI.Client/Features/Groups/ResetOffsetsAction.razor` (create).
    - **Symbols:** Strategy selector; topic/partition selection per the pinned schema; `TimeInput` for timestamp strategy.
    - **Implementation:** Confirmation is the exact group ID.
    - **Dependencies:** 15.2.1, 10.2.1, 11.3.2.
    - **Completion Check:** Phase 15 steps 5-7.
  - [ ] 15.2.3 Real-Gateway tests
    - **Source:** V19.
    - **Files:** Proposed `tests/Kafka3O.UI.ExternalIntegration.Tests/Gateway/GroupIntegrationTests.cs` (create).
    - **Symbols:** `[Trait("Category","ExternalGateway")] PreSeed_CreatesGroupAtLatest`, `Reset_ActiveGroup_ReturnsGroupActive`.
    - **Implementation:** Groups prefixed `kafka3o-it-`. The active-group case uses an active group named in the integration settings (for example kept alive by an operator-run console consumer) and is skipped (not verified) when absent; no Kafka client dependency is added (TECH §1.1).
    - **Dependencies:** 15.2.2.
    - **Completion Check:** Named tests pass or report skipped/not verified.

---

## Phase 16: Delete groups, remove members, and clone offsets

- **Phase Status:** Not Started
- **Goal:** A permitted user deletes an inactive group, removes selected or all members, and clones offsets to an inactive target group, each through the reviewed workflow.
- **Manual Test Plan:**
  1. On `ui-seeded`, choose "Delete group", preview, and confirm with `ui-seeded`. Expect Succeeded and the group gone from the list.
  2. Start the console consumer for `ui-demo-consumers`. On the group page choose "Remove members", select All, preview, and confirm with `ui-demo-consumers`. Expect the member list to become empty (the consumer rejoins later). Stop the consumer.
  3. Choose "Clone offsets" from `ui-demo-consumers` to new target `ui-clone`, optionally limited to topic `ui-demo`, and preview. Expect the planned target offsets. Confirm with the target `ui-clone` (not the source). Expect `ui-clone` listed with the same committed offsets.
  4. Try deleting `ui-demo-consumers` while the consumer runs. Expect `GROUP_ACTIVE`.

### Task 16.1: Endpoints for G5, G6, G7

- **Status:** Not Started
- **Source:** FUNC §2.5 rows G5, G6, G7; FUNC §2.6 (G7 confirms the target, not the source); ADD §2.2 rows (tier W, kind D, profile C); TECH §14.4 (G7 `sourceGroup` target)
- **Outcome:** Three confirmation-bearing group endpoints.
- **Dependencies:** Phase 15
- **Affected Files:** Proposed `src/Kafka3O.UI.Server/Features/Groups/GroupEndpoints.cs` (modify), `src/Kafka3O.UI.Contracts/Features/Groups/GroupChangeContracts.cs`, `tests/Kafka3O.UI.Server.Tests/Features/Groups/GroupDestructiveEndpointTests.cs`
- **Manual Test Mapping:** Phase 16 steps 1-4.
- **Subtasks:**
  - [ ] 16.1.1 DTOs
    - **Source:** ADD §2.2 (`DeleteGroupRequestBody`, `DeleteGroupBody`, `RemoveMembersRequestBody`, `RemoveMembersBody`, `CloneOffsetsRequestBody`, `CloneOffsetsBody`).
    - **Files:** Proposed `src/Kafka3O.UI.Contracts/Features/Groups/GroupChangeContracts.cs` (create); `DtoSchemaConformanceTests.cs` (modify).
    - **Symbols:** Matching `*Dto` records.
    - **Implementation:** Mirrors pinned schema.
    - **Dependencies:** 7.5.1.
    - **Completion Check:** Conformance rows pass.
  - [ ] 16.1.2 Endpoints
    - **Source:** ADD §2.2 rows.
    - **Files:** Proposed `src/Kafka3O.UI.Server/Features/Groups/GroupEndpoints.cs` (modify).
    - **Symbols:** `DELETE .../consumer-groups/{groupId}`, `POST .../consumer-groups/{groupId}/remove-members`, `POST .../consumer-groups/{target}/clone-offsets`.
    - **Implementation:** `DestructiveRequestRules`; G7 audit target records `target` and `sourceGroup`.
    - **Dependencies:** 16.1.1.
    - **Completion Check:** `GroupDestructiveEndpointTests`: G7 execution requires confirm equal to the target in the forwarded body; preview audited.

### Task 16.2: Group operation actions

- **Status:** Not Started
- **Source:** DES §3.5 P19 (G5, G6, G7 independent inputs, preview, confirmation, result), §5 rows G5-G7
- **Outcome:** Three actions on the group page.
- **Dependencies:** Task 16.1
- **Affected Files:** Proposed `src/Kafka3O.UI.Client/Features/Groups/DeleteGroupAction.razor`, `RemoveMembersAction.razor`, `CloneOffsetsAction.razor`, `tests/Kafka3O.UI.Client.Tests/Features/Groups/GroupActionsTests.cs`, `tests/Kafka3O.UI.ExternalIntegration.Tests/Gateway/GroupIntegrationTests.cs` (modify)
- **Manual Test Mapping:** Phase 16 steps 1-4.
- **Subtasks:**
  - [ ] 16.2.1 Actions
    - **Source:** DES §5 rows G5 (inactivity requirement), G6 (explicit/all selection), G7 (source/target, optional topics, target confirmation).
    - **Files:** Proposed `src/Kafka3O.UI.Client/Features/Groups/DeleteGroupAction.razor`, `RemoveMembersAction.razor`, `CloneOffsetsAction.razor` (create); `ConsumerGroupPage.razor` (modify).
    - **Symbols:** Actions gated by `gateway.g5`, `gateway.g6`, `gateway.g7`.
    - **Implementation:** G7 confirmation label names the target group explicitly.
    - **Dependencies:** 16.1.2, 11.3.2.
    - **Completion Check:** bUnit `GroupActionsTests`: G7 confirmation accepts the target and rejects the source name.
  - [ ] 16.2.2 Real-Gateway tests
    - **Source:** V19.
    - **Files:** Proposed `tests/Kafka3O.UI.ExternalIntegration.Tests/Gateway/GroupIntegrationTests.cs` (modify).
    - **Symbols:** `CloneOffsets_TargetMatchesSource`, `DeleteGroup_RemovesInactiveGroup`.
    - **Implementation:** `kafka3o-it-` groups only.
    - **Dependencies:** 16.2.1.
    - **Completion Check:** Named tests pass or report skipped/not verified.

---

## Phase 17: Broker configuration changes, reassignments, and leader elections

- **Phase Status:** Not Started
- **Goal:** A permitted user edits or resets broker dynamic configuration and starts or cancels reassignments or requests leader elections, each previewed and confirmed with the broker ID or the reviewed plan token.
- **Manual Test Plan:**
  1. Open broker detail > "Edit configuration", set `log.cleaner.threads` to `2`, and preview. Expect a before/after table. Confirm with the broker ID. Expect the resulting configuration showing `2` with a dynamic broker source.
  2. Reset `log.cleaner.threads`, preview, and confirm with the broker ID. Expect the default source restored.
  3. Open Cluster Administration > Reassignments > "Elect leaders", choose Preferred, topic `ui-demo`, partition `0`, and preview. Expect the resolved targets and the reviewed plan. Confirm. Expect a per-target result (on a single-broker cluster, an item outcome such as "election not needed" is shown as that item's result, not as total failure).
  4. Choose "Start reassignment" for `ui-demo` partition `0` with the current replica list and preview. Expect the resolved plan. Close without confirming. Expect no change in "Reassignments in progress".
  5. Choose "Cancel reassignment" for `ui-demo` partition `0` and preview. Expect the Gateway's plan for the current (possibly empty) set of in-progress reassignments.
  6. In Audit History filter `gateway.c9.elect`. Expect a preview pair and an execution pair.

### Task 17.1: Endpoints for C5 and C9

- **Status:** Not Started
- **Source:** FUNC §2.5 rows C5, C9; FUNC §2.6 (broker ID confirmation; C9 plan tokens); ADD §2.2 rows `gateway.c5` (PATCH), `gateway.c9.start`, `gateway.c9.cancel`, `gateway.c9.elect` (tier W, kind D, profile C)
- **Outcome:** Four confirmation-bearing endpoints.
- **Dependencies:** Phase 16
- **Affected Files:** Proposed `src/Kafka3O.UI.Server/Features/Clusters/ClusterAdminEndpoints.cs`, `src/Kafka3O.UI.Contracts/Features/Clusters/ClusterChangeContracts.cs`, `tests/Kafka3O.UI.Server.Tests/Features/Clusters/ClusterAdminEndpointTests.cs`
- **Manual Test Mapping:** Phase 17 steps 1-6.
- **Subtasks:**
  - [ ] 17.1.1 DTOs
    - **Source:** ADD §2.2 (`AlterBrokerConfigRequestBody`, `AlterBrokerConfigBody`, `ReassignRequestBody`, `CancelReassignmentsRequestBody`, `ReassignBody`, `ElectionsRequestBody`, `ElectionsBody`).
    - **Files:** Proposed `src/Kafka3O.UI.Contracts/Features/Clusters/ClusterChangeContracts.cs` (create); `DtoSchemaConformanceTests.cs` (modify).
    - **Symbols:** Matching `*Dto` records.
    - **Implementation:** Mirrors pinned schema.
    - **Dependencies:** 7.5.1.
    - **Completion Check:** Conformance rows pass.
  - [ ] 17.1.2 Endpoints
    - **Source:** ADD §2.2 rows; TECH §14.4 (`brokerId` target; C9 item counts).
    - **Files:** Proposed `src/Kafka3O.UI.Server/Features/Clusters/ClusterAdminEndpoints.cs` (create).
    - **Symbols:** `PATCH .../cluster/brokers/{brokerId}/config`, `POST .../cluster/reassignments`, `POST .../cluster/reassignments/cancel`, `POST .../cluster/elections`.
    - **Implementation:** `DestructiveRequestRules`; plan tokens passed through exactly.
    - **Dependencies:** 17.1.1, 11.1.2.
    - **Completion Check:** `ClusterAdminEndpointTests`: each preview audited; `REASSIGNMENT_IN_PROGRESS` preserved; execution with empty confirm rejected.

### Task 17.2: Broker configuration editor and reassignment/election actions

- **Status:** Not Started
- **Source:** DES §3.5 P06 (C5 set/reset, plan, broker confirmation; C5 alone does not fetch C2), P21 (C9 actions separately preview and confirm their plan token; C7 not required for explicit input), §5 rows C5, C9
- **Outcome:** C5 editor on P06 and three C9 actions on P21.
- **Dependencies:** Task 17.1
- **Affected Files:** Proposed `src/Kafka3O.UI.Client/Features/Clusters/BrokerConfigEditor.razor`, `StartReassignmentAction.razor`, `CancelReassignmentAction.razor`, `ElectLeadersAction.razor`, `tests/Kafka3O.UI.Client.Tests/Features/Clusters/ClusterAdminActionsTests.cs`, `tests/Kafka3O.UI.ExternalIntegration.Tests/Gateway/ClusterAdminIntegrationTests.cs`
- **Manual Test Mapping:** Phase 17 steps 1-5.
- **Subtasks:**
  - [ ] 17.2.1 Broker configuration editor
    - **Source:** DES §3.5 P06; DES §6.1 (redacted settings never submitted as replacements).
    - **Files:** Proposed `src/Kafka3O.UI.Client/Features/Clusters/BrokerConfigEditor.razor` (create); `BrokerDetailPage.razor` (modify).
    - **Symbols:** Editor gated by `gateway.c5`; broker-ID confirmation.
    - **Implementation:** Set and reset rows distinguished; redacted values never prefilled.
    - **Dependencies:** 17.1.2, 11.3.2.
    - **Completion Check:** bUnit: C5-only user edits without C2 call; redacted value not submitted.
  - [ ] 17.2.2 Reassignment and election actions
    - **Source:** DES §3.5 P21; FUNC §2.5 C9 (preferred/unclean election; preview resolved targets; confirm the plan token).
    - **Files:** Proposed `src/Kafka3O.UI.Client/Features/Clusters/StartReassignmentAction.razor`, `CancelReassignmentAction.razor`, `ElectLeadersAction.razor` (create); `ReassignmentsPage.razor` (modify).
    - **Symbols:** Actions gated by `gateway.c9.start`, `gateway.c9.cancel`, `gateway.c9.elect`.
    - **Implementation:** Unclean election labelled as risky with a warning; per-item outcomes via `BulkResultTable`.
    - **Dependencies:** 17.1.2, 11.3.2.
    - **Completion Check:** bUnit `ClusterAdminActionsTests`: token from preview used on execution; mismatch requires reconfirmation.
  - [ ] 17.2.3 Real-Gateway tests
    - **Source:** V19.
    - **Files:** Proposed `tests/Kafka3O.UI.ExternalIntegration.Tests/Gateway/ClusterAdminIntegrationTests.cs` (create).
    - **Symbols:** `[Trait("Category","ExternalGateway")] BrokerConfig_SetAndReset`, `PreferredElection_PreviewAndExecute`.
    - **Implementation:** Only reversible changes on allowlisted configuration keys; reset in cleanup.
    - **Dependencies:** 17.2.2.
    - **Completion Check:** Named tests pass or report skipped/not verified.

---

## Phase 18: Definitions export and import

- **Phase Status:** Not Started
- **Goal:** A permitted user downloads a byte-exact definitions export with correlation and audit headers, and imports definitions with an explicit deletion policy and plan-token confirmation.
- **Manual Test Plan:**
  1. Open Cluster Administration > Definitions, enter pattern `ui-.*`, and click "Download export". Expect a JSON file download and a success message only after the audit status is checked.
  2. Run `curl -s -D h.txt -o ui.json -b "__Host-Kafka3O.Session=$S" "http://localhost:8080/api/v1/clusters/local/cluster/export?pattern=ui-.*"`. Expect `h.txt` to contain `Content-Disposition: attachment`, `X-Request-Id`, `X-Kafka3O-Audit-Status: recorded`, `Cache-Control: no-store`. Fetch the same export directly from the Gateway with the reader key and compare `sha256sum`. Expect identical hashes.
  3. Edit `ui.json` to change a topic's `retention.ms`, then choose "Import definitions", select the file, choose deletion policy "Do not delete", and preview. Expect create, alter, delete and unchanged sets with the changed topic under alter. Confirm. Expect per-target results.
  4. Preview the import with deletion policy "Delete topics not in file" on a Gateway where deletion is disabled. Expect the plan review to work and execution to be blocked with the Gateway's reason.

### Task 18.1: Export and import endpoints (C11, C12)

- **Status:** Not Started
- **Source:** FUNC §2.5 rows C11, C12; FUNC §2.6 (C11 UI limit 10,000,000 bytes; finish fetch and result-audit attempt before headers; headers `X-Request-Id`, `X-Kafka3O-Audit-Status`; C12 plan review even when deletion disabled); TECH §11.2; ADD §5 export row and paragraph (segmented buffer, max 2 exports, 413 without attachment headers, sanitized fixed filename template, no disk spool); ADD §2.2 rows `gateway.c11` (R, A), `gateway.c12` (W, D, C)
- **Outcome:** Byte-exact bounded export download and import plan/execute endpoints.
- **Dependencies:** Phase 17
- **Affected Files:** Proposed `src/Kafka3O.UI.Server/Features/Clusters/DefinitionsEndpoints.cs`, `src/Kafka3O.UI.Server/Features/Clusters/ExportBuffer.cs`, `src/Kafka3O.UI.Contracts/Features/Clusters/DefinitionsContracts.cs`, `tests/Kafka3O.UI.Server.Tests/Features/Clusters/DefinitionsEndpointTests.cs`
- **Manual Test Mapping:** Phase 18 steps 1-4.
- **Subtasks:**
  - [ ] 18.1.1 Bounded export buffer and admission
    - **Source:** ADD §5 export row (10,000,000 bytes; in-memory segmented buffer; max 2 process-wide; no queue; 429 `Retry-After: 1`; enforce while reading; dispose after send or cancel).
    - **Files:** Proposed `src/Kafka3O.UI.Server/Features/Clusters/ExportBuffer.cs` (create).
    - **Symbols:** `ExportBuffer.ReadAsync(Stream upstream, CancellationToken) -> ExportBufferResult` (`Complete(segments)`, `TooLarge`); `ExportAdmission.TryEnter()`.
    - **Implementation:** Pooled segments released on every exit; exceeding the cap stops reading and reports `EXPORT_TOO_LARGE`.
    - **Dependencies:** None.
    - **Completion Check:** `ExportBufferTests`: exactly 10,000,000 bytes accepted; 10,000,001 -> too large; segments returned to pool after cancellation.
  - [ ] 18.1.2 Export endpoint
    - **Source:** TECH §11.2 paragraphs 2-4; ADD §5 C11 paragraph; FUNC §2.6.
    - **Files:** Proposed `src/Kafka3O.UI.Server/Features/Clusters/DefinitionsEndpoints.cs` (create).
    - **Symbols:** `GET /api/v1/clusters/{clusterId}/cluster/export`.
    - **Implementation:** Executor path with a download result: fetch fully into `ExportBuffer`, attempt RESULT recording, then write headers (`Content-Type` from upstream, `Content-Disposition: attachment; filename="kafka3o-export-{clusterId}.json"` as the fixed sanitized template, `X-Request-Id`, `X-Kafka3O-Audit-Status`, `no-store`) and the unchanged bytes; oversize -> 413 `EXPORT_TOO_LARGE` JSON without attachment headers; upstream failure -> classified error, never a partial file.
    - **Dependencies:** 18.1.1, 7.4.3.
    - **Completion Check:** `DefinitionsEndpointTests`: bytes identical to the fake upstream; no headers written before the RESULT attempt (test server observes header timing); `recording_failed` header on audit failure.
  - [ ] 18.1.3 Import endpoint
    - **Source:** FUNC §2.5 C12 (preview create/alter/delete/unchanged; explicit deletion policy; plan token; per-target results), ADD §2.2 row `gateway.c12`.
    - **Files:** Proposed `src/Kafka3O.UI.Server/Features/Clusters/DefinitionsEndpoints.cs` (modify); `src/Kafka3O.UI.Contracts/Features/Clusters/DefinitionsContracts.cs` (create); `DtoSchemaConformanceTests.cs` (modify for `ExportBody`, `ApplyTopicsRequestBody`, `ApplyTopicsBody`).
    - **Symbols:** `POST /api/v1/clusters/{clusterId}/batch/topics/apply`.
    - **Implementation:** Deletion policy required explicitly (no default); `DestructiveRequestRules`; body ≤10,000,000 bytes.
    - **Dependencies:** 18.1.2, 11.1.2.
    - **Completion Check:** `DefinitionsEndpointTests`: missing deletion policy -> 400; preview audited; execution forwards the reviewed token.

### Task 18.2: Definitions page

- **Status:** Not Started
- **Source:** DES §3.5 P22 (C11 pattern and download; C12 upload, deletion policy, plan, token confirmation, per-target results; export never grants import), TECH §10.1, §11.2 (frontend checks headers before success; persistent warning for `recording_failed`)
- **Outcome:** P22 with verified download and import review.
- **Dependencies:** Task 18.1
- **Affected Files:** Proposed `src/Kafka3O.UI.Client/Features/Clusters/DefinitionsPage.razor`, `src/Kafka3O.UI.Client/Http/DownloadClient.cs`, `src/Kafka3O.UI.Client/wwwroot/js/download.js`, `tests/Kafka3O.UI.Client.Tests/Features/Clusters/DefinitionsPageTests.cs`, `tests/Kafka3O.UI.Browser.Tests/Clusters/ExportTests.cs`, `tests/Kafka3O.UI.ExternalIntegration.Tests/Gateway/DefinitionsIntegrationTests.cs`
- **Manual Test Mapping:** Phase 18 steps 1, 3-4.
- **Subtasks:**
  - [ ] 18.2.1 Download client
    - **Source:** TECH §11.2 paragraph 1; ADD §5 (`recording_failed` is a warning, not a retry signal).
    - **Files:** Proposed `src/Kafka3O.UI.Client/Http/DownloadClient.cs`, `src/Kafka3O.UI.Client/wwwroot/js/download.js` (create).
    - **Symbols:** `DownloadClient.DownloadAsync(url) -> DownloadResult(fileName, auditStatus, requestId)`; JS `saveBlob(fileName, bytes)`.
    - **Implementation:** Fetch through `HttpClient`, read headers first, then save the bytes unchanged via an external JS module; success shown only when status is 200 and audit status parsed; errors parsed from the JSON envelope.
    - **Dependencies:** 3.6.1.
    - **Completion Check:** bUnit `DownloadClientTests`: `recording_failed` yields success with a persistent warning; 413 yields an error and no save call.
  - [ ] 18.2.2 Definitions page
    - **Source:** DES §3.5 P22.
    - **Files:** Proposed `src/Kafka3O.UI.Client/Features/Clusters/DefinitionsPage.razor` (create).
    - **Symbols:** `@page "/clusters/{ClusterId}/admin/definitions"`.
    - **Implementation:** Export and import sections gated separately; import uses `OperationReview` with the review surface.
    - **Dependencies:** 18.2.1, 18.1.3, 11.3.2.
    - **Completion Check:** Phase 18 steps 1, 3-4.
  - [ ] 18.2.3 Browser and real-Gateway tests
    - **Source:** V14, V19; TECH §11.2 last paragraph.
    - **Files:** Proposed `tests/Kafka3O.UI.Browser.Tests/Clusters/ExportTests.cs`, `tests/Kafka3O.UI.ExternalIntegration.Tests/Gateway/DefinitionsIntegrationTests.cs` (create).
    - **Symbols:** `Export_BytesPreserved`, `Export_TooLarge_NoPartialFile`; `[Trait("Category","ExternalGateway")] ExportImport_RoundTrip`.
    - **Implementation:** Browser test compares the saved file hash with the fake upstream.
    - **Dependencies:** 18.2.2.
    - **Completion Check:** Named tests pass.

---

## Phase 19: Kafka security: SCRAM credentials and quotas

- **Phase Status:** Not Started
- **Goal:** A permitted user lists SCRAM users, creates credentials with a write-only password, deletes credentials, and lists, sets and removes quotas, with operator-tier Gateway credentials for all S1/S2 calls.
- **Manual Test Plan:**
  1. Open Kafka Security > SCRAM credentials. Expect the users and mechanisms table (possibly empty).
  2. Create user `ui-user`, mechanism `SCRAM-SHA-512`, password `Scram-Pass-1`. Expect Succeeded, the password field cleared, and `ui-user` listed with its mechanism.
  3. Open the Audit History event for the creation. Expect target `name: ui-user` and `mechanism`, and no password anywhere in the detail.
  4. Delete `ui-user`: preview, confirm with `ui-user`. Expect Succeeded and the user gone.
  5. Open Quotas. Set `producer_byte_rate` = `1048576` for entity user `ui-user`, preview, confirm with the entity descriptor. Expect the entity listed with that value. Remove it the same way. Expect it gone.
  6. In the Gateway log, confirm the SCRAM list request used the operator key ID.

### Task 19.1: Endpoints for S1 and S2

- **Status:** Not Started
- **Source:** FUNC §2.5 rows S1, S2; FUNC §2.1 (S1/S2 require operator-tier credentials even for lists), §2.4 secrets row (SCRAM passwords write-only; never echoed, audited, cached or logged); ADD §2.2 rows `gateway.s1.list`, `gateway.s1.create`, `gateway.s1.delete`, `gateway.s2.list`, `gateway.s2.alter`; ADD §2.3 (S1.create password write-only); TECH §14.4 (S1 `mechanism`, S2 entity descriptor)
- **Outcome:** Five endpoints with password isolation.
- **Dependencies:** Phase 18
- **Affected Files:** Proposed `src/Kafka3O.UI.Server/Features/Security/KafkaSecurityEndpoints.cs`, `src/Kafka3O.UI.Contracts/Features/Security/KafkaSecurityContracts.cs`, `tests/Kafka3O.UI.Server.Tests/Features/Security/KafkaSecurityEndpointTests.cs`
- **Manual Test Mapping:** Phase 19 steps 1-6.
- **Subtasks:**
  - [ ] 19.1.1 DTOs with a write-only password
    - **Source:** ADD §2.2 (`ListUsersBody`, `CreateUserRequestBody`, `CreateUserBody`, `DeleteUserRequestBody`, `DeleteUserBody`, `ListQuotasBody`, `AlterQuotaRequestBody`, `AlterQuotaBody`).
    - **Files:** Proposed `src/Kafka3O.UI.Contracts/Features/Security/KafkaSecurityContracts.cs` (create); `DtoSchemaConformanceTests.cs` (modify).
    - **Symbols:** Matching `*Dto` records; the password property excluded from `ToString` and any logging.
    - **Implementation:** No response DTO contains a password field.
    - **Dependencies:** 7.5.1.
    - **Completion Check:** Conformance rows pass; reflection test asserts no response DTO has a password-like property.
  - [ ] 19.1.2 Endpoints
    - **Source:** ADD §2.2 rows (S1.list and S2.list tier W with kind R, profile A; S1.create W/W/B; S1.delete and S2.alter W/D/C).
    - **Files:** Proposed `src/Kafka3O.UI.Server/Features/Security/KafkaSecurityEndpoints.cs` (create).
    - **Symbols:** `GET/POST .../scram-users`, `DELETE .../scram-users/{name}`, `GET/PATCH .../quotas`.
    - **Implementation:** Operator credential for all five; audit targets never include the password; request bodies for S1.create are never logged; upstream validation messages sanitized.
    - **Dependencies:** 19.1.1, 11.1.2.
    - **Completion Check:** `KafkaSecurityEndpointTests`: list uses the operator key; sentinel password absent from logs, audit rows and response.

### Task 19.2: SCRAM and quota pages

- **Status:** Not Started
- **Source:** DES §3.5 P23 (separate list/create/delete; create/delete-only users enter identifiers without listing; passwords never in results/history), P24 (list not prerequisite; entity-descriptor confirmation), §5 rows S1, S2, §9 (clear transient secret fields)
- **Outcome:** P23 and P24.
- **Dependencies:** Task 19.1
- **Affected Files:** Proposed `src/Kafka3O.UI.Client/Features/Security/ScramCredentialsPage.razor`, `QuotasPage.razor`, `tests/Kafka3O.UI.Client.Tests/Features/Security/ScramCredentialsPageTests.cs`, `tests/Kafka3O.UI.Browser.Tests/Security/ScramSecretIsolationTests.cs`, `tests/Kafka3O.UI.ExternalIntegration.Tests/Gateway/KafkaSecurityIntegrationTests.cs`
- **Manual Test Mapping:** Phase 19 steps 1-5.
- **Subtasks:**
  - [ ] 19.2.1 SCRAM and quota pages
    - **Source:** DES §3.5 P23, P24, §14.1 routes.
    - **Files:** Proposed `src/Kafka3O.UI.Client/Features/Security/ScramCredentialsPage.razor`, `QuotasPage.razor` (create); `Layout/ApplicationShell.razor` (modify: Kafka Security group).
    - **Symbols:** `@page "/clusters/{ClusterId}/kafka-security/scram"`, `@page "/clusters/{ClusterId}/kafka-security/quotas"`.
    - **Implementation:** Password input type password, cleared after every outcome, never placed in state stores; delete confirmation is the exact username; quota confirmation the exact entity descriptor.
    - **Dependencies:** 19.1.2, 11.3.2.
    - **Completion Check:** bUnit `ScramCredentialsPageTests`: password cleared after success and failure.
  - [ ] 19.2.2 Secret-isolation browser test and real-Gateway tests
    - **Source:** V9, V19.
    - **Files:** Proposed `tests/Kafka3O.UI.Browser.Tests/Security/ScramSecretIsolationTests.cs`, `tests/Kafka3O.UI.ExternalIntegration.Tests/Gateway/KafkaSecurityIntegrationTests.cs` (create).
    - **Symbols:** `ScramPassword_NotInDomStorageOrResponses`; `[Trait("Category","ExternalGateway")] Scram_CreateListDelete`, `Quota_SetRemove`.
    - **Implementation:** Sentinel password searched in DOM, storage, network responses and trace artifacts.
    - **Dependencies:** 19.2.1.
    - **Completion Check:** Named tests pass.

---

## Phase 20: Operational lifecycle: retention, cleanup, metrics, and graceful shutdown

- **Phase Status:** Not Started
- **Goal:** The running application removes expired audit events, sessions and throttle rows on an hourly bounded schedule, exposes retention metrics on an internal port, and shuts down by leaving readiness first and draining admitted work.
- **Manual Test Plan:**
  1. Run `curl -s http://localhost:9090/metrics`. Expect `kafka3o_ui_audit_retention_failures_total 0` and `kafka3o_ui_audit_retention_last_success_timestamp_seconds <unix time>`. Run `curl -i http://localhost:8080/metrics`. Expect `404`.
  2. Stop the server, set `Audit:RetentionDays` to `1`, and (SQLite test database only) run `sqlite3 <db> "UPDATE AuditEvents SET occurredAt = occurredAt - 172800000 WHERE id IN (SELECT id FROM AuditEvents ORDER BY occurredAt LIMIT 5)"`. Start the server and wait 2 minutes. Expect those five events gone from Audit History, newer events kept, and the last-success gauge updated.
  3. Make the database unavailable during a run (PostgreSQL mode: stop access), wait for the next run, and check metrics. Expect the failure counter incremented and a log entry `AUDIT_RETENTION_FAILED` without sensitive values. Restore access.
  4. Start a 30-second throughput sample, then press Ctrl+C in the server terminal. Expect `/health/ready` to return `503 {"status":"not_ready"}` immediately, a new API request to return `503 NOT_READY`, the sample to complete, and the process to exit afterwards (within 90 seconds).
  5. After signing out several sessions, wait for a cleanup run and count rows with `sqlite3 <db> "select count(*) from Sessions where revokedAt is not null"`. Expect revoked and expired sessions removed; valid sessions remain.

### Task 20.1: Internal metrics endpoint and alert rules

- **Status:** Not Started
- **Source:** TECH §14.8; ADD §4.4 (metric names, alert conditions)
- **Outcome:** A second listener on 9090 serves Prometheus text metrics; the application listener returns 404 for `/metrics`; alert rule files exist for the Helm chart.
- **Dependencies:** Phase 19
- **Affected Files:** Proposed `src/Kafka3O.UI.Server/Infrastructure/Hosting/MetricsRegistry.cs`, `Infrastructure/Hosting/MetricsEndpoint.cs`, `src/Kafka3O.UI.Server/Program.cs` (modify), `src/Kafka3O.UI.Server/appsettings.json` (modify), `tests/Kafka3O.UI.Server.Tests/Infrastructure/Hosting/MetricsEndpointTests.cs`
- **Manual Test Mapping:** Phase 20 steps 1-3.
- **Subtasks:**
  - [ ] 20.1.1 Metrics registry and listener
    - **Source:** TECH §14.8 bullets 1-2.
    - **Files:** Proposed `src/Kafka3O.UI.Server/Infrastructure/Hosting/MetricsRegistry.cs`, `MetricsEndpoint.cs` (create); `Program.cs`, `appsettings.json` (modify: Kestrel endpoint `http://0.0.0.0:9090`).
    - **Symbols:** `MetricsRegistry.IncrementRetentionFailures()`, `SetRetentionLastSuccess(DateTimeOffset)`; `GET /metrics` bound only to port 9090 (`RequireHost("*:9090")`).
    - **Implementation:** Text format 0.0.4 with `# HELP`/`# TYPE`; gauge initialized to process start time; no labels with identity or cluster data; security headers still applied.
    - **Dependencies:** None (registry and listener are independent of the scheduler).
    - **Completion Check:** `MetricsEndpointTests`: 9090 returns both metrics; 8080 `/metrics` -> 404.
  - [ ] 20.1.2 Alert rule file
    - **Source:** TECH §14.8 bullet 3; ADD §4.4 (failure increase or no success for 2 hours).
    - **Files:** Proposed `deploy/helm/kafka3o-ui/files/alerts.yaml` (create).
    - **Symbols:** Alerts `Kafka3OUIAuditRetentionFailed` (`increase(kafka3o_ui_audit_retention_failures_total[1h]) > 0`), `Kafka3OUIAuditRetentionStale` (`time() - kafka3o_ui_audit_retention_last_success_timestamp_seconds > 7200`).
    - **Implementation:** Plain Prometheus rule-group YAML; the chart's optional `PrometheusRule` template (Phase 22) includes it.
    - **Dependencies:** 20.1.1.
    - **Completion Check:** `promtool check rules deploy/helm/kafka3o-ui/files/alerts.yaml` passes where `promtool` is available (CI step in Task 23.2).

### Task 20.2: Scheduled retention and cleanup

- **Status:** Not Started
- **Source:** FUNC §3.7 (retention refinement), TECH §11.6, ADD §4.4 (one TimeProvider hourly scheduler; frozen cutoff; oldest-first batches of 1,000 per short transaction; 30-second run budget; failure stops the run; structured error; metrics), ADD §4.3 last paragraph (expired throttle rows deletable after 15 minutes idle with no active verification; CAS), ADD §4.4 paragraph 2 (invalid sessions only), V18
- **Outcome:** A single non-overlapping hourly job performs audit retention, session cleanup and throttle cleanup within bounds.
- **Dependencies:** Task 20.1
- **Affected Files:** Proposed `src/Kafka3O.UI.Server/Features/Audit/AuditRetentionService.cs`, `src/Kafka3O.UI.Server/Features/Identity/SessionCleanupService.cs`, `src/Kafka3O.UI.Server/Features/Identity/ThrottleCleanupService.cs`, `src/Kafka3O.UI.Server/Infrastructure/Hosting/HourlyMaintenanceScheduler.cs`, persistence stores (modify), `tests/Kafka3O.UI.Server.Tests/Features/Audit/AuditRetentionServiceTests.cs`, `tests/Kafka3O.UI.Persistence.Tests/RetentionTests.cs`
- **Manual Test Mapping:** Phase 20 steps 2-3, 5.
- **Subtasks:**
  - [ ] 20.2.1 Hourly scheduler
    - **Source:** ADD §4.4 paragraph 1 (TimeProvider-based, no overlapping runs).
    - **Files:** Proposed `src/Kafka3O.UI.Server/Infrastructure/Hosting/HourlyMaintenanceScheduler.cs` (create).
    - **Symbols:** `HourlyMaintenanceScheduler : BackgroundService` running registered `IScheduledCleanup.RunAsync(CancellationToken)` jobs in sequence.
    - **Implementation:** First run 1 minute after readiness (implementation guidance), then hourly; a run still in progress skips the next tick; stops on shutdown.
    - **Dependencies:** Phase 2 readiness.
    - **Completion Check:** `HourlyMaintenanceSchedulerTests` with `FakeTimeProvider`: no overlap; runs hourly.
  - [ ] 20.2.2 Audit retention job
    - **Source:** TECH §11.6; ADD §4.4.
    - **Files:** Proposed `src/Kafka3O.UI.Server/Features/Audit/AuditRetentionService.cs` (create); `src/Kafka3O.UI.Server/Infrastructure/Persistence/AuditStore.cs` (modify).
    - **Symbols:** `AuditRetentionService.RunAsync`; `IAuditRetentionStore.DeleteOlderThanAsync(long cutoffMs, int batchSize) -> int`.
    - **Implementation:** Cutoff = run start - `RetentionDays`; delete where `occurredAt < cutoff` ordered by `(occurredAt, id)`, 1,000 per transaction, until none remain or 30 seconds elapse; failure stops the run, logs `AUDIT_RETENTION_FAILED` (ERROR, no values) and increments the counter; success sets the gauge. Never disables audit recording.
    - **Dependencies:** 20.2.1, 20.1.1.
    - **Completion Check:** `RetentionTests` (both providers): event exactly at cutoff kept; expired unresolved attempt deleted without reclassification; in-window RESULT kept when its ATTEMPT expired; 2,500 expired rows deleted in 3 batches.
  - [ ] 20.2.3 Session and throttle cleanup jobs
    - **Source:** ADD §4.4 paragraph 2; ADD §4.3 last paragraph.
    - **Files:** Proposed `src/Kafka3O.UI.Server/Features/Identity/SessionCleanupService.cs`, `ThrottleCleanupService.cs` (create); `SessionStore.cs`, `LoginThrottleStore.cs` (modify).
    - **Symbols:** `ISessionStore.DeleteInvalidAsync(long nowMs, int batchSize)`; `ILoginThrottleStore.DeleteIdleAsync(long nowMs, int batchSize)`.
    - **Implementation:** Sessions deleted only when revoked or expired (1,000-row batches); throttle rows deleted only when `lastFailureAt + 15min <= now`, no in-process verification holds the pair lock, and the revision still matches.
    - **Dependencies:** 20.2.1.
    - **Completion Check:** `RetentionTests`: valid session never deleted; throttle row updated concurrently survives deletion.

### Task 20.3: Graceful shutdown and drain

- **Status:** Not Started
- **Source:** TECH §7.5 (stop admitting work; bounded draining; interrupted mutations unknown), §8.6 (drain 90 seconds; termination grace 110 seconds), ADD §5 Shutdown (mark unready; reject new operations 503; cancel polling/scheduler; retain result-audit opportunity), TECH §14.6 (advisory-lock loss triggers drain)
- **Outcome:** On SIGTERM or lock loss the server leaves readiness, rejects new work with 503 `NOT_READY`, completes admitted requests up to 90 seconds with result auditing, then exits.
- **Dependencies:** Task 20.2
- **Affected Files:** Proposed `src/Kafka3O.UI.Server/Infrastructure/Hosting/ShutdownCoordinator.cs`, `src/Kafka3O.UI.Server/Program.cs` (modify), `tests/Kafka3O.UI.Server.Tests/Infrastructure/Hosting/ShutdownTests.cs`
- **Manual Test Mapping:** Phase 20 step 4.
- **Subtasks:**
  - [ ] 20.3.1 Shutdown coordinator
    - **Source:** ADD §5 Shutdown row; TECH §8.6.
    - **Files:** Proposed `src/Kafka3O.UI.Server/Infrastructure/Hosting/ShutdownCoordinator.cs` (create); `Program.cs` (modify: `HostOptions.ShutdownTimeout` 90s).
    - **Symbols:** `ShutdownCoordinator` hooked to `IHostApplicationLifetime.ApplicationStopping`; middleware rejecting new API requests with 503 `NOT_READY`.
    - **Implementation:** Mark readiness false, stop scheduler, reject new operations, track in-flight operations, wait up to 90 seconds; result-audit writes may complete within their 5-second bound; no request is replayed.
    - **Dependencies:** 20.2.1, 1.5.3.
    - **Completion Check:** `ShutdownTests`: during stop, ready -> 503; new request -> 503 `NOT_READY`; an in-flight delayed Gateway call completes and its RESULT is recorded.
  - [ ] 20.3.2 Lock-loss integration
    - **Source:** TECH §14.6 bullet 1.
    - **Files:** Proposed `src/Kafka3O.UI.Server/Infrastructure/Hosting/InstanceLockHostedService.cs` (modify).
    - **Symbols:** `ConnectionLost` handler calls `IHostApplicationLifetime.StopApplication()` after marking not ready; exit code non-zero.
    - **Implementation:** Uses the same drain path.
    - **Dependencies:** 20.3.1, 2.2.3.
    - **Completion Check:** `InstanceLockTests.AdvisoryConnectionLost_DrainsAndExitsNonZero` (PostgreSQL).

---

## Phase 21: Backup, restore, recovery reconciliation, and certificate rotation

- **Phase Status:** Not Started
- **Goal:** An operator backs up database and key material with a manifest, restores behind a recovery marker, reconciles access (revoking all sessions) before reopening, and rotates the Data Protection certificate without losing old keys.
- **Manual Test Plan:**
  1. Stop the server. Create a backup following `config/README.md`: `sqlite3 <db> ".backup backups/db.bak"`, `tar -cf backups/keys.tar -C <keyring> .`, then `pwsh scripts/write-backup-manifest.ps1 -Output backups/backup-manifest.json ...`. Expect a manifest with SHA-256 values matching `sha256sum` output.
  2. Run `-- maintenance recovery begin --incident-id 2b7d6c1e-8f3a-4d0b-9c2e-5a1f7e3b9d40`. Expect exit 0 and `{StatePath}/recovery-pending.json`. Start the server. Expect a non-zero exit stating recovery is pending.
  3. Restore the database from `backups/db.bak` and extract `backups/keys.tar` into the key-ring directory. Run `-- maintenance keys verify`. Expect exit 0.
  4. Query current role and assignment IDs and revisions with `sqlite3`, write `backups/reconcile.json` per TECH §14.11 with desired values equal to current values, then run `-- maintenance recovery reconcile --manifest backups/reconcile.json`. Expect exit 0, the marker removed, and an `app.recovery.reconcile` RESULT in the audit log after restart.
  5. Start the server and refresh a browser that had a session before the backup. Expect redirection to `/signin` (all sessions revoked).
  6. Repeat steps 2-4 with one expected revision changed in `reconcile.json`. Expect exit 4, the marker kept, and the server still refusing to start. Correct the manifest and reconcile. Expect exit 0.
  7. Create a new Data Protection certificate, set `DataProtection:Certificates` to [new, old], restart, and run `-- maintenance keys verify` while stopped. Expect exit 0 listing both thumbprints; signing in and submitting forms still works.
  8. In PostgreSQL mode, repeat steps 1-5 using `pg_dump -Fc` and `pg_restore` into a clean database. Expect the same results.

### Task 21.1: Recovery marker and startup gate

- **Status:** Not Started
- **Source:** ADD §6 `recovery begin` row and paragraph 5 (marker outside the restore set; existing marker requires explicit continuation), ADD §5 Startup (recovery marker), TECH §9.6
- **Outcome:** `maintenance recovery begin` writes a protected marker that blocks startup until reconciliation.
- **Dependencies:** Phase 20
- **Affected Files:** Proposed `src/Kafka3O.UI.Server/Infrastructure/Maintenance/RecoveryMarker.cs`, `RecoveryBeginCommand.cs`, `tests/Kafka3O.UI.Server.Tests/Infrastructure/Maintenance/RecoveryBeginCommandTests.cs`
- **Manual Test Mapping:** Phase 21 step 2.
- **Subtasks:**
  - [ ] 21.1.1 `maintenance recovery begin`
    - **Source:** ADD §6 table row; ADD §6 exit codes.
    - **Files:** Proposed `src/Kafka3O.UI.Server/Infrastructure/Maintenance/RecoveryMarker.cs`, `RecoveryBeginCommand.cs` (create).
    - **Symbols:** `RecoveryBeginCommand.RunAsync(Guid incidentId, bool continueExisting) -> int`; marker JSON `{incidentId, installationId, createdAt}`.
    - **Implementation:** Exclusivity required; atomic write to `{StatePath}/recovery-pending.json`; an existing marker with a different incident exits 3 unless `--continue` names the same incident.
    - **Dependencies:** 2.2.3.
    - **Completion Check:** `RecoveryBeginCommandTests`: second begin exits 3; startup gate (2.4.3) refuses while present.

### Task 21.2: Reconciliation command

- **Status:** Not Started
- **Source:** ADD §6 `recovery reconcile` row and paragraphs 2, 5 (verify keys and schema; invalidate all sessions; apply reviewed access state; durable RESULT in the same transaction; marker cleared only after commit; rerun verifies RESULT and manifest hash), TECH §14.11 reconciliation manifest, TECH §9.6, TECH §14.4 (`app.recovery.reconcile`)
- **Outcome:** Reconciliation validates the reviewed manifest against the restored state, applies it atomically with its audit record and session revocation, and clears the marker.
- **Dependencies:** Task 21.1
- **Affected Files:** Proposed `src/Kafka3O.UI.Server/Infrastructure/Maintenance/ReconciliationManifest.cs`, `RecoveryReconcileCommand.cs`, `tests/Kafka3O.UI.Persistence.Tests/RecoveryReconcileTests.cs`
- **Manual Test Mapping:** Phase 21 steps 4-6.
- **Subtasks:**
  - [ ] 21.2.1 Manifest model and validation
    - **Source:** TECH §14.11 reconciliation table.
    - **Files:** Proposed `src/Kafka3O.UI.Server/Infrastructure/Maintenance/ReconciliationManifest.cs` (create).
    - **Symbols:** `ReconciliationManifest` record; `ReconciliationValidator.Validate(manifest, marker, keyManifest, options, restoredRoles, restoredAssignments) -> ValidationOutcome`.
    - **Implementation:** Unknown fields -> exit 2; installation/incident mismatch, stale expected set, omitted or added IDs, credential-version mismatch -> exit 4; desired roles/assignments validated with the Phase 5 validators.
    - **Dependencies:** 5.1.1, 5.2.1, 21.1.1.
    - **Completion Check:** `RecoveryReconcileTests` theory over each failure category (both providers), each leaving data unchanged.
  - [ ] 21.2.2 Apply reconciliation atomically
    - **Source:** ADD §6 paragraph 5 (incidentId is the ATTEMPT ID and RESULT `attemptId`; crash after commit leaves access blocked; rerun does not apply twice; missing evidence after retention stops for a new decision).
    - **Files:** Proposed `src/Kafka3O.UI.Server/Infrastructure/Maintenance/RecoveryReconcileCommand.cs` (create).
    - **Symbols:** `RecoveryReconcileCommand.RunAsync(string manifestPath) -> int`.
    - **Implementation:** Verify keys and schema; commit ATTEMPT (id = incidentId); in one transaction apply desired roles/assignments with new revisions, revoke all sessions, insert RESULT (`attemptId` = incidentId, target with manifest hash and approval reference); then delete the marker. If a RESULT for the incident already exists with the same manifest hash, only remove the marker.
    - **Dependencies:** 21.2.1.
    - **Completion Check:** `RecoveryReconcileTests`: success revokes all sessions; simulated crash before marker removal -> rerun exits 0 without a second RESULT.

### Task 21.3: Backup helper, rotation procedure, and documentation

- **Status:** Not Started
- **Source:** ADD §6 backup and restore procedures, certificate rotation paragraph; TECH §9.5; TECH §14.11 (operator writes the backup manifest; `scripts/` may provide a helper)
- **Outcome:** A documented, scripted backup-manifest helper and verified rotation/restore procedures.
- **Dependencies:** Task 21.2
- **Affected Files:** Proposed `scripts/write-backup-manifest.ps1`, `config/README.md` (modify), `tests/Kafka3O.UI.Server.Tests/Infrastructure/Maintenance/CertificateRotationTests.cs`
- **Manual Test Mapping:** Phase 21 steps 1, 3, 7-8.
- **Subtasks:**
  - [ ] 21.3.1 Backup manifest helper
    - **Source:** TECH §14.11 backup table; ADD §6 backup procedure (record UTC time, provider/schema IDs, tool versions, installation ID, SHA-256).
    - **Files:** Proposed `scripts/write-backup-manifest.ps1` (create).
    - **Symbols:** Parameters `-Output`, `-DatabaseBackup`, `-KeyRingBackup`, `-Provider`, `-InstallationId`, `-AppliedMigrations`, `-Tool`, `-ToolVersion`.
    - **Implementation:** Computes lowercase SHA-256, writes relative paths and exactly the schema fields; contains no secrets.
    - **Dependencies:** 2.4.1.
    - **Completion Check:** A manifest written by the script passes `BackupManifestValidator` in `BackupManifestTests.ScriptOutput_Validates`.
  - [ ] 21.3.2 Rotation and restore documentation and tests
    - **Source:** ADD §6 paragraphs 3-4 (backup and restore steps; rotation mounts old and new certificates; retain old until no live or backup key needs it), TECH §9.5.
    - **Files:** Proposed `config/README.md` (modify), `tests/Kafka3O.UI.Server.Tests/Infrastructure/Maintenance/CertificateRotationTests.cs` (create).
    - **Symbols:** README sections "Backup", "Restore", "Certificate rotation"; tests `Rotation_OldKeysStillDecrypt`, `Rotation_NewKeysUseNewCertificate`.
    - **Implementation:** Documents SQLite backup API/CLI (not copying the main file alone), matching-major `pg_dump`/`pg_restore`, isolated restore testing, and certificate retirement rules.
    - **Dependencies:** 2.3.1.
    - **Completion Check:** Phase 21 step 7; named tests pass.

---

## Phase 22: Container image and Helm chart

- **Phase Status:** Not Started
- **Goal:** The application builds as one Linux container image and deploys through a Helm chart with one replica, Recreate strategy, file-mounted secrets, durable volumes, internal metrics, and optional maintenance Job and alert rules.
- **Manual Test Plan:**
  1. Run `helm lint deploy/helm/kafka3o-ui`. Expect `1 chart(s) linted, 0 chart(s) failed`.
  2. Run `helm template t deploy/helm/kafka3o-ui -f deploy/helm/kafka3o-ui/values-example.yaml`. Expect a Deployment with `replicas: 1`, `strategy.type: Recreate`, container ports 8080 and 9090, readiness probe `/health/ready`, liveness probe `/health/live`, `terminationGracePeriodSeconds: 110`, secrets mounted as files, key-ring and operations-state volumes from `ReadWriteOnce` claims, a Service exposing only 8080, and a separate ClusterIP metrics Service on 9090. Expect no Job and no PrometheusRule.
  3. Render again with `--set maintenance.enabled=true --set prometheusRule.enabled=true`. Expect a maintenance Job running the same image with `maintenance` arguments and the same volumes, and a PrometheusRule containing both alerts.
  4. Open the latest pull request's `image` workflow job. Expect the image built from `deploy/Dockerfile`, a container started with test configuration, `/health/live` returning 200, and the logged SQLite engine version `3.53.4`.

### Task 22.1: Dockerfile and image smoke test

- **Status:** Not Started
- **Source:** TECH §1.2 packaging row, §1.2 last paragraph (SDK in build stage only; image tags and digests selected and validated before release), §1.6 items 2 and 5, §5.4 (`deploy/Dockerfile`), TECH §14.3 (ports)
- **Outcome:** A multi-stage Dockerfile producing a runtime image without the SDK, with pinned base-image digests recorded for review, and a CI smoke test.
- **Dependencies:** Phase 21
- **Affected Files:** Proposed `deploy/Dockerfile`, `.dockerignore`, `src/Kafka3O.UI.Server/Infrastructure/Hosting/SqliteEngineLog.cs`, `.github/workflows/pr.yml` (modify)
- **Manual Test Mapping:** Phase 22 step 4.
- **Subtasks:**
  - [ ] 22.1.1 Multi-stage Dockerfile
    - **Source:** TECH §1.2; §1.6 item 5.
    - **Files:** Proposed `deploy/Dockerfile`, `.dockerignore` (create).
    - **Symbols:** Stages `build` (.NET SDK 10.0.401 image by digest) and `runtime` (ASP.NET Core 10.0.12 Linux image by digest); non-root user; `EXPOSE 8080 9090`.
    - **Implementation:** `dotnet publish --locked-mode` of the Server (includes Client assets); no secrets or config in the image; base images and digests are an implementation-time selection recorded in the PR for review under the release gates.
    - **Dependencies:** Phase 1 build.
    - **Completion Check:** CI builds the image; `docker history` shows no SDK layers in the runtime stage.
  - [ ] 22.1.2 SQLite engine identity log and smoke test
    - **Source:** TECH §1.6 item 2 (verify SQLite engine identity inside the target container).
    - **Files:** Proposed `src/Kafka3O.UI.Server/Infrastructure/Hosting/SqliteEngineLog.cs` (create); `.github/workflows/pr.yml` (modify: job `image`).
    - **Symbols:** Startup log `SQLite engine version {version}` (SQLite mode, from `select sqlite_version()`).
    - **Implementation:** CI job runs the container with a generated test configuration, initializes keys and migrates with `maintenance` commands, starts the server, checks `/health/live` 200 and the logged version equals 3.53.4.
    - **Dependencies:** 22.1.1.
    - **Completion Check:** Phase 22 step 4.

### Task 22.2: Helm chart

- **Status:** Not Started
- **Source:** TECH §1.3 (one replica, non-overlapping upgrades, durable storage), §5.4, §14.3 (file-mounted secrets; ports), §14.6 bullet 3 (Recreate; maintenance Job disabled by default; RWO operations volume), §14.8 (metrics Service; optional PrometheusRule), §8.6 (termination grace 110 seconds), ADD §5 Health
- **Outcome:** A chart rendering the approved deployment shape with sanitized example values.
- **Dependencies:** Task 22.1, Task 20.1
- **Affected Files:** Proposed `deploy/helm/kafka3o-ui/Chart.yaml`, `values.yaml`, `values-example.yaml`, `templates/deployment.yaml`, `templates/service.yaml`, `templates/metrics-service.yaml`, `templates/pvc.yaml`, `templates/configmap.yaml`, `templates/maintenance-job.yaml`, `templates/prometheusrule.yaml`, `templates/_helpers.tpl`
- **Manual Test Mapping:** Phase 22 steps 1-3.
- **Subtasks:**
  - [ ] 22.2.1 Deployment, services, and volumes
    - **Source:** TECH §1.3, §14.6, §14.8, §8.6, ADD §5 Health.
    - **Files:** Proposed `deploy/helm/kafka3o-ui/Chart.yaml`, `values.yaml`, `templates/deployment.yaml`, `templates/service.yaml`, `templates/metrics-service.yaml`, `templates/pvc.yaml`, `templates/configmap.yaml`, `templates/_helpers.tpl` (create).
    - **Symbols:** Values `image`, `config` (non-secret `Kafka3O` settings rendered to a ConfigMap as JSON), `secrets` (existing Secret names mounted as files), `persistence.keyRing`, `persistence.operationsState`, `persistence.sqliteData`.
    - **Implementation:** `replicas` fixed at 1 (not configurable); `Recreate`; probes; grace 110s; read-only root filesystem with writable mounted volumes; no secret values in chart defaults.
    - **Dependencies:** 22.1.1.
    - **Completion Check:** Phase 22 steps 1-2.
  - [ ] 22.2.2 Optional maintenance Job and PrometheusRule
    - **Source:** TECH §14.6 bullet 3; TECH §14.8 bullet 3.
    - **Files:** Proposed `deploy/helm/kafka3o-ui/templates/maintenance-job.yaml`, `templates/prometheusrule.yaml`, `values-example.yaml` (create).
    - **Symbols:** Values `maintenance.enabled`, `maintenance.args`, `prometheusRule.enabled`.
    - **Implementation:** Job uses the same image, volumes and secrets with `args: ["maintenance", ...]`; PrometheusRule embeds `files/alerts.yaml`.
    - **Dependencies:** 22.2.1, 20.1.2.
    - **Completion Check:** Phase 22 step 3.

---

## Phase 23: Release gates, traceability, and nightly verification

- **Phase Status:** Not Started
- **Goal:** CI enforces the complete PR and nightly gates, traceability proves exactly 46 operation bindings / 49 permissions / 16 application routes / deferred-feature absence and V1-V20 coverage, and release-evidence scripts produce the required dependency, SBOM, scan and screenshot artifacts.
- **Manual Test Plan:**
  1. Run `pwsh scripts/test.ps1 -Suite api -Filter "Category=Traceability"`. Expect tests confirming 46 registered Gateway endpoints equal to the catalog, 49 permission literals, 16 application routes, and 404 for `/replays` and every `/message-workflows` route including for the emergency identity.
  2. Open `tests/TRACEABILITY.md`. Expect every V1-V20 criterion and every active operation mapped to named tests; deferred checks (original V15 replay behavior, B1/B2 adapter tests) listed as deferred, not passed.
  3. Trigger the `nightly` workflow manually. Expect Chromium, Firefox and WebKit browser jobs, and an external-integration job that either passes against the configured test Gateway or reports "skipped / not verified" when its secrets are absent.
  4. Run `pwsh scripts/security.ps1`. Expect `dotnet list package --vulnerable --include-transitive` output saved under `artifacts/security/` with a timestamp, and a non-zero exit if any vulnerability at any severity is reported.
  5. Run `pwsh scripts/test.ps1 -Suite browser -Filter "Category=Screenshots"`. Expect screenshots at 360x800, 768x1024, 1440x900 and 1920x1080 plus a 320px reflow check under `artifacts/screenshots/`.

### Task 23.1: Contract traceability and deferred-feature absence

- **Status:** Not Started
- **Source:** FUNC §3.8 (contract traceability bijection), V1, V15, TECH §13.3, ADD §11.4 items 1-2, 4, TECH §4.2
- **Outcome:** Automated counts and absence checks plus a traceability document.
- **Dependencies:** Phase 22
- **Affected Files:** Proposed `tests/Kafka3O.UI.Server.Tests/Contract/TraceabilityTests.cs`, `tests/TRACEABILITY.md`
- **Manual Test Mapping:** Phase 23 steps 1-2.
- **Subtasks:**
  - [ ] 23.1.1 Traceability tests
    - **Source:** ADD §11.4 items 1-2; TECH §13.1.
    - **Files:** Proposed `tests/Kafka3O.UI.Server.Tests/Contract/TraceabilityTests.cs` (create).
    - **Symbols:** `[Trait("Category","Traceability")]` tests `RegisteredGatewayEndpoints_EqualCatalog46`, `PermissionCatalog_Is49`, `ApplicationRoutes_Are16`, `DeferredRoutes_Return404_ZeroGatewayCalls` (theory over `/replays` and the four `/message-workflows` methods, for SSO and emergency sessions), `RoleInput_RejectsGatewayM8`.
    - **Implementation:** Enumerate `EndpointDataSource` for registered routes; compare with `GatewayOperationCatalog`.
    - **Dependencies:** All feature phases.
    - **Completion Check:** Phase 23 step 1.
  - [ ] 23.1.2 Traceability document
    - **Source:** TECH §4.2 (traceability for V1-V20 and every operation keyed by command and sub-operation ID); FUNC §3.8 V15; ADD §11.4 item 4.
    - **Files:** Proposed `tests/TRACEABILITY.md` (create).
    - **Symbols:** Tables: V1-V20 -> test names; 46 operations -> workflow page, contract test, authorization test, integration test; deferred checks.
    - **Implementation:** A test (`TraceabilityDocumentTests`) fails when an operation or V-ID is missing from the document.
    - **Dependencies:** 23.1.1.
    - **Completion Check:** Phase 23 step 2.

### Task 23.2: Nightly workflow and complete PR gate

- **Status:** Not Started
- **Source:** TECH §4.4 (nightly and before release: all browsers and real Gateway/Kafka across two environments; opt-in IdP separate), §4.4 bullets (missing prerequisites skipped, not passed; retained artifacts sanitized), plan assumption 1
- **Outcome:** Nightly workflow and final PR gate composition.
- **Dependencies:** Task 23.1
- **Affected Files:** Proposed `.github/workflows/nightly.yml`, `.github/workflows/pr.yml` (modify)
- **Manual Test Mapping:** Phase 23 step 3.
- **Subtasks:**
  - [ ] 23.2.1 Nightly workflow
    - **Source:** TECH §4.4 nightly row; FUNC §3.8 integration suite (two Gateway registrations in different environments, both credential tiers, safety configurations).
    - **Files:** Proposed `.github/workflows/nightly.yml` (create).
    - **Symbols:** Jobs `browsers` (matrix chromium, firefox, webkit), `external-gateway` (uses `KAFKA3O_IT_CONFIG` from a protected GitHub environment), `external-idp` (manual dispatch only).
    - **Implementation:** Schedule plus `workflow_dispatch`; skipped external tests are reported as "not verified" in the job summary and never marked passing; artifacts sanitized (no secrets in traces).
    - **Dependencies:** 23.1.1.
    - **Completion Check:** Phase 23 step 3.
  - [ ] 23.2.2 Final PR gate checks
    - **Source:** TECH §4.4 pull-request row; §4.2 coverage floors; TECH §14.8 alert rules.
    - **Files:** Proposed `.github/workflows/pr.yml` (modify).
    - **Symbols:** Jobs `build-test` (with coverage floors), `persistence`, `browser-chromium`, `image`, `helm` (`helm lint`, `helm template`, `promtool check rules`).
    - **Implementation:** All jobs required for merge; coverage floors 90% line / 85% branch enforced.
    - **Dependencies:** 23.2.1.
    - **Completion Check:** A pull request shows all jobs green.

### Task 23.3: Accessibility and screenshot matrix

- **Status:** Not Started
- **Source:** DES §8, §10 (screenshots at 360x800, 768x1024, 1440x900, 1920x1080 plus 320px reflow; long names, large offsets, empty lists, 207 results, unavailable clusters, multi-line errors, review dialogs, emergency session; manual keyboard/screen-reader review), V20
- **Outcome:** Deterministic screenshot suite, state coverage tests and a manual accessibility checklist.
- **Dependencies:** Task 23.1
- **Affected Files:** Proposed `tests/Kafka3O.UI.Browser.Tests/Design/ScreenshotMatrixTests.cs`, `tests/Kafka3O.UI.Browser.Tests/Design/StateMatrixTests.cs`, `tests/Kafka3O.UI.Browser.Tests/Design/ACCESSIBILITY-CHECKLIST.md`
- **Manual Test Mapping:** Phase 23 step 5.
- **Subtasks:**
  - [ ] 23.3.1 Screenshot and state matrix tests
    - **Source:** DES §10 paragraph after table; DES §7 state rows; V20.
    - **Files:** Proposed `tests/Kafka3O.UI.Browser.Tests/Design/ScreenshotMatrixTests.cs`, `StateMatrixTests.cs` (create).
    - **Symbols:** `[Trait("Category","Screenshots")]` theory over viewports and fixture states; `StateMatrix_EveryStateRendered` (loading, empty, denied, unavailable, success, partial, failed, unknown, audit warning, session expired).
    - **Implementation:** Fake Gateway fixtures with long names and offset `9223372036854775807`; assert no horizontal page scroll at 320px and no overlapping controls via bounding boxes.
    - **Dependencies:** 23.1.1.
    - **Completion Check:** Phase 23 step 5.
  - [ ] 23.3.2 Manual accessibility checklist
    - **Source:** DES §8.2, §10 last paragraph (manual keyboard, focus, screen reader, zoom, reduced motion, contrast).
    - **Files:** Proposed `tests/Kafka3O.UI.Browser.Tests/Design/ACCESSIBILITY-CHECKLIST.md` (create).
    - **Symbols:** Checklist sections per DES §8.2 requirement.
    - **Implementation:** Records reviewer, date and findings per release; unchecked items block release sign-off.
    - **Dependencies:** 23.3.1.
    - **Completion Check:** Checklist exists and is referenced from `tests/TRACEABILITY.md`.

### Task 23.4: Release-evidence scripts and performance baselines

- **Status:** Not Started
- **Source:** TECH §1.6 items 1-7, §4.5 (performance workloads; numeric limits require later agreement), TECH §15.4, plan assumption 5
- **Outcome:** Scripts that collect dependency, vulnerability, SBOM and scan evidence, and documented performance workloads.
- **Dependencies:** Task 23.2
- **Affected Files:** Proposed `scripts/security.ps1`, `scripts/release-evidence.ps1`, `tests/Performance/README.md`, `tests/Performance/workloads.json`
- **Manual Test Mapping:** Phase 23 step 4.
- **Subtasks:**
  - [ ] 23.4.1 Vulnerability and dependency evidence
    - **Source:** TECH §1.6 items 1, 3, 4 (zero tolerance at every severity; missing or stale results block release; preserve scanner version, timestamp, component versions and findings).
    - **Files:** Proposed `scripts/security.ps1` (create).
    - **Symbols:** `scripts/security.ps1 [-Output artifacts/security]`.
    - **Implementation:** Runs `dotnet list package --vulnerable --include-transitive --format json` for every project, stores output with timestamp and SDK version, exits non-zero on any finding or command failure.
    - **Dependencies:** Phase 1 lockfiles.
    - **Completion Check:** Phase 23 step 4.
  - [ ] 23.4.2 SBOM and container scan selection
    - **Source:** TECH §1.6 items 1, 3, 5; plan assumption 5.
    - **Files:** Proposed `scripts/release-evidence.ps1` (create); `Directory.Packages.props` or `.config/dotnet-tools.json` (modify, if an approved tool is a .NET tool).
    - **Symbols:** `scripts/release-evidence.ps1 -ImageDigest <digest>`.
    - **Implementation:** Present the SBOM generator and container/OS scanner choice for dependency approval; once approved, pin versions and have the script produce the SBOM for the image and scan each published platform variant, failing on any finding or missing evidence. Until approved, the script exits non-zero with "release evidence incomplete" (never a clean result).
    - **Dependencies:** 23.4.1, 22.1.1.
    - **Completion Check:** Without an approved scanner the script exits non-zero with the incomplete-evidence message.
  - [ ] 23.4.3 Performance workload definitions
    - **Source:** TECH §4.5 (API latency, browser timing, throughput, errors, CPU, memory under documented concurrency; controlled Gateway responses; both databases; no load-generator framework selected; numeric limits later).
    - **Files:** Proposed `tests/Performance/README.md`, `tests/Performance/workloads.json` (create).
    - **Symbols:** Workloads: cluster overview reads, topic list pagination, bounded message browse, produce single and bulk, audit history paging.
    - **Implementation:** Procedures use the fake Gateway and both database providers and record environment details; numeric thresholds are left for agreement and are not enforced.
    - **Dependencies:** 7.2.4.
    - **Completion Check:** Documents exist and describe reproducible runs; no numeric performance claim is made.

---

## Traceability Matrix

| Requirement area | Tasks |
|---|---|
| FUNC §1.5 / TECH §13 reduced-v1 scope, deferred features | 7.1, 7.4.4, 13.1, 23.1 |
| FUNC §2.1 trust boundaries, TECH §2.3 typed client | 7.2, 7.4 |
| FUNC §2.2 configuration and data contracts, TECH §14.3 | 1.3, 3.5.3, 5.2 |
| FUNC §2.3 permissions and roles, TECH §8.2 | 3.5, 5.1-5.3 |
| FUNC §2.4 shared Gateway contracts | 7.2, 7.3, 9.1-9.2, 12.1, 18.1 |
| FUNC §2.5 operations (46) | C1/C3/C4 7.5; C2/C6/C7/C8 8.1; C10 10.1; C5/C9 17.1; C11/C12 18.1; T1/T2 9.1; T3/T4 10.1; T5/T6 9.2; T7/T9 11.2; T8/T10-T12 14.1; M1-M4 13.1; M5-M7 12.2; G1/G2/G4 15.1; G3 10.1; G5-G7 16.1; S1/S2 19.1 |
| FUNC §2.6 bounds and confirmations, TECH §14.2 | 10.1.1, 11.1, 13.1.2, 18.1 |
| FUNC §3.1-3.2 authentication, sessions, emergency | 3.2-3.4, 6.1-6.3 |
| FUNC §3.3 cluster selection and availability | 3.5.3, 7.2.3, 7.6 |
| FUNC §3.4-3.5 workflow, destructive, override | 7.4, 11.1, 11.3, 12.2.3 |
| FUNC §3.6 message inspection | 13.1, 13.2 |
| FUNC §3.7 audit, persistence, retention | 3.1, 4.1-4.2, 20.2 |
| FUNC §3.10 remediation F1-F10 | F2 7.2.3; F3 1.3; F4 1.4 and all UI tasks; F5 3.1.1, 4.1.1; F6 1.5.4; F7 2.2; F8 1.5.2; F9 1.4.4 and page tasks; F10 20.1 |
| TECH §1 stack and release gates | 1.1, 1.6, 22.1, 23.4 |
| TECH §2-3 patterns and SOLID | 1.6.2 (boundaries), 3.1.2 (`IAuditWriter`/`IAuditReader`), 7.4 (shared enforcement), all stores behind feature-owned interfaces |
| TECH §4 testing strategy | 1.6, 2.1.4, 2.5, 6.3, 7.2.4, 23.2, 23.3, 23.4.3 |
| TECH §5 topology | 1.1, 1.6.1, 22 |
| TECH §7.1-7.3, §9.3-9.5, §10.4-10.6 security and keys | 2.3, 3.2-3.4, 6.1 |
| TECH §7.4, §8.4, §11.5, ADD §4 persistence | 2.1, 3.1.2, 3.3.1, 3.4.1, 5.1.3, 5.2.2 |
| TECH §7.5, §8.6, ADD §5 operations and limits | 1.5.1, 7.4.1, 12.2.1, 18.1.1, 20.3 |
| TECH §8.3, ADD §3.2 application routes (16) | 3.3.3, 3.2.2, 3.4.3, 3.5, 4.1.3, 5.1.4, 5.2.2, 6.1.3, 23.1.1 |
| TECH §8.5, §10.1, §11.3, ADD §3.4, TECH §14.5 envelopes and errors | 1.5.4, 7.2.3, 7.4.3 |
| TECH §8.6, §9.6, ADD §6, TECH §14.6, §14.11 maintenance and recovery | 1.2, 2.2-2.4, 21.1-21.3 |
| TECH §14.7 security headers | 1.5.2, 1.6.3 |
| TECH §14.8 metrics | 20.1, 22.2.2 |
| TECH §16.1-16.5 clarifications S1-S5 | S1 1.3.2, 10.1.1; S2 1.2.2; S3 2.4.2; S4 3.5.3; S5 7.4.2, 12.2.3 |
| DES §3-§10, §14 | 1.4, 3.6, 4.2, 5.4, 7.6, 8.2, 9.3, 10.2, 11.3, 12.3, 13.2, 14.2, 15.2, 16.2, 17.2, 18.2, 19.2, 23.3 |
| V1 inventory | 7.1.2, 23.1 |
| V2, V3 SSO, claims | 6.3.2 |
| V4 enforcement | 3.5.2, 7.4.3, 23.1.1 |
| V5 role changes | 5.1-5.4 |
| V6 sessions | 3.3, 3.6.5 |
| V7 emergency | 3.4, 3.6.5 |
| V8 dependency isolation | 6.3.2, 7.5.2, 7.6.4 |
| V9 secret isolation | 1.3.2, 1.6.3, 3.6.5, 19.2.2 |
| V10 destructive plans | 11.1-11.3, 14.2 |
| V11 Gateway safety | 11.3.4, 12.2.3 |
| V12 bounds and reads | 10.1.1, 13.1, 13.2.4 |
| V13 data integrity | 7.3, 12.1, 13.2 |
| V14 bulk and uploads | 9.2, 12.1.2, 18.2.3 |
| V15 deferred replay exclusion | 7.4.4, 23.1.1 |
| V16 cluster context | 7.6.1, 13.2.4 |
| V17 audit gate | 3.1.2, 5.1.4, 7.4.3 |
| V18 retention and storage | 2.1.4, 20.2 |
| V19 real integrations | 6.3.4, 7.6.4 and per-phase integration subtasks, 23.2.1 |
| V20 application states | 9.3.1, 23.3.1 |
