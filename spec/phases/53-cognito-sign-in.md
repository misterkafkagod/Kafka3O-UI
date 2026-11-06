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
- [ ] **T53.3 Issue and refresh Cognito application sessions** — Covers: F27-AC2, F27-AC4
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
