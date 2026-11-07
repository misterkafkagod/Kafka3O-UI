# P53 · F27-B2 — Cognito sign-in and group refresh
- **Milestone:** M10
- **Covers:** F27-AC2, the Cognito portions of F27-AC3 and F27-AC4
- **Discovery:** [cognito-user-pool-fixture.md](../discovery/cognito-user-pool-fixture.md)
- **Status:** Building

## Existing baseline and boundaries
P51/P52 supply local Console sessions, audited local account administration
and an authentication-only HTTPS preview. No Cognito provider, AWS account,
group-management UI or secured Kafka path is available. The discovery recipe
is derived from AWS documentation, not a live User Pool. This phase uses an
isolated Cognito-compatible HTTPS fixture; real-pool interoperability,
native-browser callback/cookie behavior and deployment remain unverified.

SSO is optional. Provider failure must not block local login or cause the
existing manual Kafka deployment to change. Group grants come only from
administrator-configured server policy; grant management and protected Kafka
access are P54/P55. No unknown identity receives an implicit direct role or
is linked to a local account by email.

## Demo
1. Run the synthetic HTTPS identity provider and the Console with its
   separate test database. Complete an authorization-code login with PKCE,
   state and nonce; see a role-free application session and no Kafka routes.
2. Reject wrong issuer/client, forged or expired token, wrong nonce, replayed
   callback, unauthorized group and unavailable provider. Local login still
   works during the provider outage.
3. Refresh group claims within five minutes or token expiry, fail closed on
   refresh failure, locally log out before offering provider logout, and
   verify no request is automatically replayed or credentials logged.

## Tasks
- [x] **T53.1 Verify configured Cognito ID tokens** — Covers: F27-AC2
  - Files: Gateway `go.mod`, `go.sum`, `internal/console/cognito/` (new
    discovery, verifier and tests), Gateway `internal/console/README.md`,
    `spec/TECH-SPEC.md`, `spec/ROADMAP.md`.
  - Do: Add the approved maintained OIDC/OAuth libraries. Discover only an
    explicitly configured verified-HTTPS issuer, require exact configured
    authorization/token/JWKS endpoints and disable redirects. Verify RS256,
    issuer, intended client/audience, expiry, nonce and `token_use=id` with
    the library; use opaque `(issuer, sub)`, accept additive unknown claims,
    and return only verified group names. Exercise key rotation and failures
    with a synthetic verified-TLS provider. Do not mount login routes yet.
  - Done when: `go test ./internal/console/cognito` passes the successful,
    forged, expired, wrong-pool/client/nonce/use, untrusted-TLS, endpoint
    substitution and key-rotation cases, and `go test ./...` passes.
- [x] **T53.2 Persist browser-bound, single-use authorization attempts** — Covers: F27-AC2
  - Files: Gateway `internal/console/cognito/` (new attempt actions/tests),
    `internal/console/storage/migrate_database.go` and new attempt storage
    actions/tests, Gateway `internal/console/README.md`.
  - Do: Generate independent random state, nonce, PKCE verifier and browser
    binding; persist only digests of state/binding/nonce and protect any
    retained verifier with an externally supplied encryption key. Bound
    attempt count and lifetime, transactionally consume a matching,
    unexpired attempt once before exchange, and audit denials without
    callback parameters or credentials. Reject replay, expired/queued
    attempts, wrong browser, malformed input, audit failure and uncertain
    consumption without retry; preserve existing local data in migration.
  - Done when: `go test ./internal/console/cognito ./internal/console/storage -run 'Test.*Cognito'`
    passes replay, browser binding, expiry, encryption, migration, audit
    failure and concurrent-consumption cases, and `go test ./...` passes.
- [x] **T53.3a Exchange consumed authorization codes once** — Covers: foundation of F27-AC2
  - Files: Gateway `go.mod`, `internal/console/cognito/`, related SQLite
    audit/attempt actions and tests, Gateway `internal/console/README.md`,
    `spec/TECH-SPEC.md`, `spec/ROADMAP.md`.
  - Do: Bind pending attempts to the exact provider and callback, then
    durably reserve a consumed attempt once before exchanging its code over
    verified HTTPS with explicit client authentication. Verify the ID token
    and nonce, bound responses, prevent redirects and automatic retries, and
    withhold credentials on audit, expiry or uncertain outcomes. Older
    unbound pending attempts must fail closed after upgrade.
  - Done when: synthetic public/confidential TLS fixtures cover successful,
    forged, expired, wrong-nonce, wrong-provider/callback, replay, concurrent,
    audit-failure, interrupted, redirect and untrusted-TLS cases;
    `go test ./internal/console/cognito ./internal/console/storage -run 'Test.*Cognito'`
    and `go test ./...` pass.
- [x] **T53.3b Verify refreshed ID tokens** — Covers: foundation of F27-AC4
  - Files: Gateway `internal/console/cognito/` verifier actions/tests,
    Gateway `internal/console/README.md`, `spec/TECH-SPEC.md`.
  - Do: Reuse the initial verifier's signature, issuer, client, expiry,
    token-use and group validation; compare refreshed issuer, subject and
    audience to the trusted previous identity, allow an absent nonce but
    compare a present nonce to the original digest, and reject a missing or
    stale ID token. Reject tokens at least five minutes old and require
    strictly later issuance than the preceding verified token. Retain the
    mandatory initial-login nonce check.
  - Done when: synthetic TLS tests cover absent and matching nonces,
    audience reordering, changed identities/audiences, stale, malformed,
    forged and expired tokens, key-service outage and unchanged initial
    verification, and `go test ./...` passes.
- [x] **T53.3c Protect retained refresh tokens** — Covers: foundation of F27-AC4
  - Files: Gateway `internal/console/cognito/` protection actions/tests,
    exchange fixture tests and Gateway `internal/console/README.md`,
    `spec/TECH-SPEC.md`.
  - Do: Protect a bounded provider refresh token with AES-256-GCM under a
    separate deployment key; bind it to the provider, callback, identity,
    session and refresh generation. Reject malformed tokens, reused attempt
    keys, wrong bindings, tampering and random-source failures. Do not claim
    persistence, rotation, rollback prevention, sessions or a login route.
  - Done when: protection tests cover key separation, limits, tampering,
    substitution and concurrency; exchange tests reject malformed refresh
    tokens; focused Cognito tests and `go test ./...` pass.
- [x] **T53.3d Create audited Cognito sessions** — Covers: foundation of F27-AC2, F27-AC4
  - Files: Gateway `internal/console/cognito/`, `session/`, `storage/` and
    session API actions/tests, Gateway `internal/console/README.md`,
    `spec/TECH-SPEC.md`, `spec/ROADMAP.md`.
  - Do: Use a provider-bound, non-forgeable exchange proof and durable
    one-use reservation to atomically create or find an enabled `(issuer,
    sub)` identity and audited opaque session with separately encrypted
    refresh-token storage. Create no grants or email links. Preserve local
    session behavior, distinguish authentication sources, require an enabled
    matching provider/protector, deny stale or disabled sessions, and let
    local administrators list/revoke Cognito sessions. Permit CSRF-checked
    local logout of unavailable sessions and delete retained provider
    credentials on revocation; retention cleanup remains a predeployment task.
  - Done when: synthetic tests cover encrypted persistence/restart,
    no direct grants or local linking, expiry, disabled identities,
    source and configuration isolation, audit/commit failure, single-use
    concurrency, unavailable-session logout and administrator revocation;
    migration preserves existing state and
    focused Cognito tests plus `go test ./...` pass. Provider refresh and
    browser integration remain separate unfinished work.
- [x] **T53.3e Reserve Cognito refreshes durably** — Covers: foundation of F27-AC4
  - Files: Gateway `internal/console/cognito/`, `session/`, and `storage/`
    refresh-reservation actions/tests, Gateway `internal/console/README.md`,
    `spec/TECH-SPEC.md`, `spec/ROADMAP.md`.
  - Do: Reserve one refresh per session and generation in durable audit
    before any provider request. Recheck the session, enabled identity,
    provider-bound encrypted credential and idle/absolute expiry after
    queued work. Block session use while a reservation remains unresolved;
    deny replay, concurrent reservation, audit failures and uncertain
    outcomes without returning provider material or retrying. Keep local
    login and local logout independent.
  - Done when: synthetic tests cover restart/replay, concurrent reservations,
    protected snapshot recovery, stale claims, expiry, revocation, disabled
    identities, key/tampering, audit and commit failures, and unaffected
    local sessions; focused Cognito tests and `go test ./...` pass. Provider
    requests, successful rotation and browser integration remain unfinished.
- [x] **T53.3f Exchange reserved Cognito refreshes once** — Covers: foundation of F27-AC4
  - Files: Gateway `internal/console/cognito/` and `storage/` refresh
    actions/tests, Gateway `internal/console/README.md`,
    `spec/TECH-SPEC.md`, `spec/ROADMAP.md`.
  - Do: After the durable reservation, send one verified-HTTPS refresh
    request using the configured client authentication; never retry or
    follow redirects. Require and verify a fresh ID token against the
    previous identity and original nonce, protect the rotated or retained
    refresh token for the next generation, and return only a private,
    provider-bound completion proof. Audit failures without tokens and keep
    the application session blocked until a later atomic completion.
  - Done when: synthetic TLS tests cover public/confidential clients, rotation
    and no rotation, invalid/missing/forged claims, malformed token responses,
    outage/redirect/interruption, replay/concurrency, expiration and audit
    failures; focused Cognito tests and `go test ./...` pass. Atomic storage
    completion, group grants and browser integration remain unfinished.
- [x] **T53.3g Complete reserved Cognito refreshes atomically** — Covers: foundation of F27-AC4
  - Files: Gateway `internal/console/cognito/` and `storage/` refresh
    actions/tests, Gateway `internal/console/README.md`,
    `spec/TECH-SPEC.md`, `spec/ROADMAP.md`.
  - Do: Consume the private completion proof once. In one transaction,
    recheck its reservation and outcome, the unchanged protected credential
    and verified snapshot, enabled identity, revocation, source, generation,
    provider/key binding and claim/session deadlines. Atomically replace the
    verified claims and encrypted retained or rotated token, advance the
    generation and append a redacted success audit. Fail closed on stale,
    changed, replayed, failed-audit or uncertain state; never resend or
    automatically retry a consumed generation.
  - Done when: synthetic tests cover persistence/restart, repeated rotation,
    no rotation, exact claim deadlines, concurrency/replay, altered snapshot,
    tampering, provider/key mismatch, expiry, revocation, disablement, audit
    and commit failures, and unaffected local sessions; focused Cognito tests
    and `go test ./...` pass. Session-manager refresh coordination, browser
    integration, group grants and secured deployment remain unfinished.
- [x] **T53.3h Coordinate Cognito session refreshes** — Covers: foundation of F27-AC3, F27-AC4
  - Files: Gateway `internal/console/session/`, `cognito/`, `storage/` and
    session API tests, `src/components/ConsoleSessionGate.tsx` and tests,
    Gateway `internal/console/README.md`, `spec/TECH-SPEC.md`,
    `spec/ROADMAP.md`.
  - Do: Add an opt-in refresh-aware session manager using the same store as
    the verified exchanger. Coalesce concurrent refreshes per session,
    bound concurrent work and its duration, recheck freshness and session
    state, and revalidate every request after completion. Never grant stale
    claims or retry an unresolved generation. Report provider, audit and
    in-flight uncertainty as service unavailable without clearing cookies;
    preserve independent local login and CSRF-checked local logout, and
    offer sign-out from the unavailable preview state.
  - Done when: synthetic HTTPS tests cover stale refresh, rotation,
    concurrent requests and managers, cancellation, restart/unresolved
    reservations, outages, revocation, audit failure, local sessions and
    HTTP cookie handling; focused Cognito and preview tests, `go test ./...`
    and the UI suite pass. Browser SSO, group grants and secured deployment
    remain unfinished.
- [x] **T53.3i Clean up inactive Cognito session credentials** — Covers: foundation of F27-AC3, F27-AC4
  - Files: Gateway `internal/console/storage/` cleanup action/tests,
    `cmd/console/` maintenance wiring/tests, Gateway
    `internal/console/README.md`, `spec/TECH-SPEC.md`, `spec/ROADMAP.md`.
  - Do: Transactionally revoke and remove retained Cognito credentials only
    for sessions already revoked, disabled, or at their idle/absolute expiry.
    Preserve active sessions with stale claims or unresolved refreshes and
    preserve refresh-reservation audit events. Process at most 100 credentials
    per batch with a redacted audit event per session. Run one bounded batch
    on Console startup and every minute; report maintenance failures without
    preventing independent local login, and stop the worker on shutdown.
    Document backlog, database/WAL/backup and undeployed-process limitations.
  - Done when: tests cover exact deadlines, local and active-session
    isolation, unresolved refresh, disable/reenable, concurrency with refresh
    and logout, bounded batches, restart, audit/commit failure, clock and
    cancellation, and worker scheduling/error/shutdown behavior; focused
    cleanup tests and `go test ./...` pass.
- [x] **T53.3j Resolve configured Cognito group grants** — Covers: foundation of F27-AC2, F27-AC4
  - Files: Gateway `internal/console/storage/` migration and session-grant
    actions/tests, `internal/console/session/` grant-resolution action/tests,
    `internal/console/cognito/` provider-binding checks, Gateway
    `internal/console/README.md`, `spec/TECH-SPEC.md`, `spec/ROADMAP.md`.
  - Do: Add an initially empty server-owned mapping of exact issuer and
    case-sensitive verified group names to global or per-cluster roles.
    Resolve only current session-bound verified claims, combining matching
    mappings with direct grants additively. Recheck session, account,
    provider/key binding, pending refresh, claim freshness and current
    mappings in one transaction; never return stale claims or group names.
    Local sessions use direct grants only. Do not expose mapping changes or
    secured Kafka access here; their audited administration and independent
    enforcement remain P54/P55.
  - Done when: tests cover migration/restart, unmapped, case/prefix/issuer
    mismatches, additive global/scoped roles, current mapping changes,
    verified group refresh, local isolation, stale/pending/disabled/revoked
    sessions, changed keys, exact deadlines, queued work, malformed state
    and operational failure; focused Cognito tests and `go test ./...` pass.
- [x] **T53.3 Issue and refresh Cognito application sessions** — Covers: F27-AC2, F27-AC4
  - Files: Gateway `internal/console/cognito/` (new exchange/refresh
    actions/tests), `internal/console/session/` and
    `internal/console/storage/` (new Cognito identity, session and refresh
    actions/tests and necessary existing session/migration files), Gateway
    `internal/console/README.md`.
  - Do: Exchange each consumed code once with explicit client authentication;
    verify the ID token and atomically create or find the enabled `(issuer,
    sub)` identity and an audited opaque session. Do not merge emails or
    create direct grants. Encrypt retained refresh tokens with a separate
    deployment key, serialize refresh per session and handle rotation
    atomically. Reverify issuer, subject, client, token use, expiry and
    groups at most five minutes or token expiry; fail closed on outage,
    revocation, stale/changed/disabled identity, audit failure or unknown
    refresh, without retry. In accordance with OIDC Core 12.2, compare the
    refreshed issuer, subject and audience to the original; allow an absent
    refresh nonce but require the original nonce if one is present. Reject a
    refresh without an ID token because it cannot refresh group claims. Keep
    the initial authorization-code nonce check mandatory. Apply only
    configured exact group bindings;
    preserve local session behavior and logout.
  - Done when: `go test ./internal/console/cognito ./internal/console/session ./internal/console/storage -run 'Test.*Cognito'`
    passes role-free identity, no email linking, refresh/rotation,
    concurrency, revocation, disabled identity, outage, audit and
    no-replay cases, and `go test ./...` passes.
- [x] **T53.4a Prepare browser-bound Cognito authorization** — Covers: foundation of F27-AC2
  - Files: Gateway `internal/console/cognito/` authorization URL and
    transient-cookie actions/tests, `internal/console/storage/` synthetic
    provider integration tests, Gateway `internal/console/README.md`,
    `spec/TECH-SPEC.md`, `spec/ROADMAP.md`.
  - Do: Construct an authorization URL only from the verified configured
    provider and exact callback, with `openid`, code flow, state, nonce and
    PKCE S256. Provide a host-only Secure HttpOnly SameSite=Lax cookie for
    the short-lived browser binding and a matching deletion cookie. Reject
    malformed or expired inputs; never put the browser binding, PKCE verifier,
    client secret or provider tokens into the URL. Keep the existing
    application cookie Strict. Expose no browser route yet.
  - Done when: focused `Test.*CognitoBrowser` tests cover exact parameters,
    provider/callback binding, malformed and expired inputs, cookie
    attributes, deletion and redaction, and `go test ./...` passes.
- [x] **T53.4b Validate browser callbacks and bindings** — Covers: foundation of F27-AC2
  - Files: Gateway `internal/console/cognito/` callback and cookie readers,
    authorization-code validation and tests, `internal/console/storage/`
    synthetic provider integration tests, Gateway
    `internal/console/README.md`, `spec/TECH-SPEC.md`, `spec/ROADMAP.md`.
  - Do: Parse only bounded, unambiguous callback parameters with one
    canonical state and either a code or a provider error; reject duplicate,
    unknown, malformed or unsafe values. Ignore provider error descriptions
    and destinations instead of returning or following them. Read exactly
    one valid browser-binding cookie without exposing its value. Reuse
    authorization-code validation for both callback and exchange. Expose no
    route and do not claim session-replacement protection.
  - Done when: focused `Test.*CognitoBrowser` tests cover valid and rejected
    parameters, redaction, cookie ambiguity, one-shot synthetic exchange and
    replay denial, and `go test ./...` passes.
- [x] **T53.4c Serialize browser-bound session issuance** — Covers: foundation of F27-AC2, F27-AC4
  - Files: Gateway `internal/console/storage/` migration, local/Cognito
    session creation and binding tests, `internal/console/session/` record
    and error types, Gateway `internal/console/README.md`,
    `spec/TECH-SPEC.md`, `spec/ROADMAP.md`.
  - Do: Add an optional server-side digest of a separate stable browser
    marker to a session and transactionally bind that marker to at most one
    active local or Cognito session. Reject and audit competing issuance;
    allow replacement only after definite revocation, disablement or
    idle/absolute expiry. Preserve old unbound sessions. Until a bound
    resolver exists, ordinary session use, grants and provider refresh must
    fail closed for bound sessions. Do not expose marker or login routes.
  - Done when: focused `Test.*BrowserSession` tests cover migration/restart,
    local/Cognito conflicts and concurrency, expiry/revocation/disablement,
    retained binding after replacement, audit and operational failures,
    redaction and unbound isolation; `go test ./...` passes.
- [x] **T53.4d Revalidate browser-bound sessions and grants** — Covers: foundation of F27-AC2, F27-AC4
  - Files: Gateway `internal/console/storage/` session-use and grant
    resolution actions/tests, Gateway `internal/console/README.md`,
    `spec/TECH-SPEC.md`, `spec/ROADMAP.md`.
  - Do: Add separate bound session-use and grant-resolution actions that
    require a nonzero marker digest and transactionally verify both the
    session digest and its current marker-to-session mapping. Reuse existing
    session, credential, claim-freshness and grant rules. Fail closed for
    stale, wrong, missing, replaced, revoked, disabled or expired bindings,
    and surface storage failures. Preserve the existing unbound paths,
    including their independence from the binding table. Expose no manager
    or route; bound refresh, logout and administrator reauthorization remain
    unavailable until their own binding checks are implemented.
  - Done when: focused `Test.*BoundSession` tests cover local and Cognito
    sessions, direct and group grants, wrong or replaced markers, revocation,
    disablement, expiration, storage failure, restart, redaction and unbound
    isolation; `go test ./...` passes.
- [x] **T53.4e Bind logout lookup and revocation** — Covers: foundation of F27-AC3, F27-AC4
  - Files: Gateway `internal/console/storage/` logout lookup and session
    revocation actions/tests, `internal/console/httpapi/` logout handler and
    tests, Gateway `internal/console/README.md`, `spec/TECH-SPEC.md`,
    `spec/ROADMAP.md`.
  - Do: Add bound Cognito logout lookup and local/Cognito revocation actions
    that require the current marker-to-session binding. Recheck that binding
    in the transaction that revokes the session, deletes retained Cognito
    credentials and records its audit. Permit explicit local logout of a
    current bound Cognito session even when its claims, identity or lifetime
    are unavailable, but never let an old or wrong binding affect a
    replacement. Treat audit, storage and uncertain commits as operational
    failures. The existing HTTP logout handler must clear cookies only for
    an exact invalid-session result, not a joined operational failure.
    Preserve unbound logout behavior and keep all managers and routes
    unbound until the browser integration is ready.
  - Done when: focused `Test.*BoundLogout` tests cover current, stale and
    competing bindings, unavailable Cognito sessions, atomic credential
    deletion/audit, commit failure, restart, redaction and unbound isolation;
    HTTP tests cover uncertain logout without cookie deletion; `go test ./...`
    passes.
- [x] **T53.4f Reauthorize bound administrators** — Covers: foundation of F27-AC4, F28-AC3
  - Files: Gateway `internal/console/identity/` administrator actor,
    `internal/console/storage/` administrator authorization and its callers
    and tests, Gateway `internal/console/README.md`, `spec/TECH-SPEC.md`,
    `spec/ROADMAP.md`.
  - Do: Allow a trusted administrator actor to carry the optional browser
    marker digest. For bound actors, transactionally verify the session's
    digest and current browser-to-session mapping alongside current local
    global-ADMIN, identity, credential and lifetime checks on every
    administrator reservation, completion, listing and mutation. Reject
    regressing clocks as operational failures and prevent an old or wrong
    binding from authorizing actions after replacement. Keep marker digests
    out of outputs and audit, preserve unbound isolation, and do not accept
    browser-supplied actor fields or expose bound routes.
  - Done when: focused `Test.*BoundAdmin` tests cover all administrator
    action families, current/wrong/replaced bindings, reservation races,
    revocation/disablement/grant changes, failures, redaction and unbound
    isolation; `go test ./...` passes.
- [x] **T53.4g Inspect and reserve bound Cognito refreshes** — Covers: foundation of F27-AC4
  - Files: Gateway `internal/console/storage/` Cognito refresh inspection and
    reservation actions and tests, Gateway `internal/console/README.md`,
    `spec/TECH-SPEC.md`, `spec/ROADMAP.md`.
  - Do: Add storage-only bound inspection and reservation actions that
    transactionally verify both the session marker digest and its current
    browser mapping, current identity and lifetime, protected credential and
    durable per-generation replay reservation. Reject regressing clocks as
    operational failures; withhold reservation material after uncertain
    commits or expired post-commit checks. Keep unbound behavior independent
    of the binding table and reject bound sessions on unbound paths. Do not
    dispatch provider refresh or expose bound managers or routes yet.
  - Done when: focused `Test.*BoundCognitoRefresh` tests cover exact claim
    deadlines, wrong or replaced markers, queued changes, concurrent
    reservation, restart, audit/commit failure, clock regression, redaction
    and unbound isolation; `go test ./...` passes.
- [x] **T53.4h Guard bound refresh dispatch** — Covers: foundation of F27-AC4
  - Files: Gateway `internal/console/cognito/` refresh types,
    `internal/console/storage/` bound dispatch guard and tests, Gateway
    `internal/console/README.md`, `spec/TECH-SPEC.md`, `spec/ROADMAP.md`.
  - Do: Add a storage-only pre-dispatch guard that rechecks the exact
    attempted reservation, current session and browser binding, identity,
    deadlines, provider credential and original verified snapshot. Require a
    non-regressing clock, withhold success for changed, expired or uncertain
    state, and keep marker and provider data out of output and audit. Do not
    call the provider or expose a bound manager or route.
  - Done when: focused `Test.*BoundCognitoRefreshDispatch` tests cover valid,
    changed and replaced bindings and snapshots, queued replacement, replay,
    deadlines, clock regression, restart and redaction; `go test ./...`
    passes.
- [x] **T53.4i Audit bound refresh failures** — Covers: foundation of F27-AC4
  - Files: Gateway `internal/console/storage/` Cognito refresh failure audit
    actions and tests, Gateway `internal/console/README.md`,
    `spec/TECH-SPEC.md`, `spec/ROADMAP.md`.
  - Do: Record a bound reservation's failed-before-send or unknown outcome
    using its original session marker digest and exact durable attempt,
    without requiring that marker still point to the old session. Never alter
    the replacement, expose binding material, or let unbound failure auditing
    consume a live bound reservation. Recheck non-regressing time and report
    audit, commit and uncertain outcomes explicitly.
  - Done when: focused `Test.*BoundCognitoRefreshFailure` tests cover current,
    replaced, revoked and disabled sessions, wrong and unbound markers,
    durable audit and restart, clock regression, failures, redaction and
    unbound isolation; `go test ./...` passes.
- [x] **T53.4j Exchange and complete bound refreshes** — Covers: foundation of F27-AC4
  - Files: Gateway `internal/console/cognito/` refresh exchange and proof
    actions, `internal/console/storage/` completion actions and tests,
    Gateway `internal/console/README.md`, `spec/TECH-SPEC.md`,
    `spec/ROADMAP.md`.
  - Do: Carry the marker digest through bound reservation, pre-dispatch
    validation, one-shot provider exchange, failure audit and an opaque
    single-use completion proof. Atomically recheck the same current binding,
    reservation, identity, encrypted credential, verified snapshot and
    deadlines before persisting a verified next generation. A different or
    unbound marker must not consume a bound proof; replacement or revocation
    during a provider request must not restore the old session. Never retry
    uncertain provider outcomes, and keep managers and routes unbound.
  - Done when: focused `Test.*BoundCognitoRefreshExchange` tests cover
    retained and rotated credentials, proof isolation, changed and replaced
    bindings before and during dispatch, concurrency, failures, clocks,
    restart, redaction and unbound isolation; `go test ./...` passes.
- [x] **T53.4k Coordinate bound refreshes** — Covers: foundation of F27-AC4
  - Files: Gateway `internal/console/session/` refresh coordination and
    session-resolution actions, Gateway `internal/console/storage/` tests,
    Gateway `internal/console/README.md`, `spec/TECH-SPEC.md`,
    `spec/ROADMAP.md`.
  - Do: Add a trusted-marker bound resolution path and carry its digest
    through refresh inspection, single-flight coordination, exchange and
    completion. Coalesce only the same session and marker, apply the
    existing global capacity and timeout limits, and revalidate each waiter
    against the current binding after successful refresh. Preserve
    cancellation isolation and explicit uncertain outcomes; never retry an
    uncertain provider request or let an unbound path use a bound session.
    Do not expose a marker, browser route or secured deployment.
  - Done when: focused `Test.*BoundCognitoSessionRefresh` tests cover fresh
    and stale sessions, retention and rotation, wrong and missing bindings,
    unbound isolation, concurrent waiters and managers, cancellation,
    replacement, provider and storage failures, clocks, restart and
    redaction; coordinator bounds and `go test ./...` pass.
- [ ] **T53.4 Expose opt-in HTTPS SSO and logout** — Covers: F27-AC2, F27-AC3
  - Files: Gateway `internal/console/httpapi/` (new SSO handlers/tests and
    necessary API wiring), `cmd/console/` (configuration/composition and
    tests), `src/console/`, `src/components/ConsoleSessionGate.tsx` and
    associated UI tests, Gateway `internal/console/README.md`.
  - Do: Add an opt-in same-origin SSO start and callback with a short-lived,
    host-only Secure HttpOnly SameSite=Lax pre-authentication cookie; keep
    the application cookie Strict. Bind the callback to its originating
    browser, reject existing-session replacement, unknown parameters and
    unsafe redirect destinations, clear transient cookies, and never log
    query strings or codes. Keep SSO unavailable independently of local
    login when provider discovery fails. Locally revoke and clear the
    application session before offering the allowlisted Cognito logout
    endpoint; make provider failure explicit and do not claim upstream
    federation sign-out. No Kafka or grant-management route is added.
  - Done when: `go test ./internal/console/httpapi ./cmd/console -run 'Test.*Cognito'`
    and focused ConsoleSessionGate tests pass, covering Origin, callback
    binding/replay, secure cookies, provider outage, logout and no replay;
    full Gateway and UI suites and default build pass.
- [ ] **T53.5 Verify the complete fixture flow** — Covers: F27-AC2, F27-AC3, F27-AC4
  - Files: Gateway `cmd/console/` and `internal/console/cognito/` fixture
    tests, `src/console/previewIntegration.test.ts` and tightly coupled test
    helpers, Gateway `internal/console/README.md`, `spec/TECH-SPEC.md`.
  - Do: Exercise the built authentication-only preview and real Console
    against the independently trusted synthetic HTTPS provider, including
    role-free login, refresh, replay/forgery denial, provider outage, local
    login and logout. Verify no legacy Gateway traffic, secrets in
    logs/responses, or retry of an interrupted mutation. Record live Cognito,
    native-browser and deployment limits honestly.
  - Done when: the opt-in end-to-end fixture, `go test ./...`, `npm test`,
    preview and default `npm run build`, focused race tests and the configured
    Go vulnerability scan pass; the existing EKS-D UI, Kafka pods and
    persistent volumes remain unchanged.

## Review
