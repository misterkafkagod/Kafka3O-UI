# Discovery: browser-marker-protocol
- **Goal:** Find a fail-closed way to initialize and use the stable browser
  marker for Cognito SSO in modern browsers, and observe real Cognito
  authorization-code, refresh, revoke and logout behavior.
- **Done when:** Real-browser probes show how concurrent first use, delayed
  or interrupted responses, closed tabs and the cross-site Cognito callback
  behave, and a recipe for T53.4 follows from them.
- **Phase:** P53 (T53.4)
- **Status:** Done
- **Decision (user, 2026-11-07):** SSO requires modern browser coordination
  (Web Locks); when it is unavailable SSO fails closed while local login keeps
  working.
- **Secrets used:** `COGNITO_CLIENT_SECRET`, `COGNITO_TEST_USERNAME`,
  `COGNITO_TEST_PASSWORD` from the user-only file
  `%USERPROFILE%\.kafka3o\cognito-test.env` (also in AWS Secrets Manager
  `kafka3o/test/cognito`). Probe output contains only cookie names,
  booleans, status codes and claim names/types.

## Log
### 1. Cookie attributes on the probe origin — 2026-11-07
- **Tried:** Set `__Host-k3o-m` (Secure; HttpOnly; Path=/; SameSite=Strict)
  from a same-origin `fetch` POST on `http://localhost:8443`, then read
  whether the next same-origin request carries it.
- **Command:** `node browser-marker-protocol/probe.mjs cookies` (Playwright
  1.64.1: Chromium 156.0.8078.4, Firefox 157.0, WebKit 27.2, installed
  Chrome 156.0.8078.80 and Edge 156.0.4314.58).
- **Result:** All five report a secure context and `navigator.locks`.
  Chromium, Firefox, Chrome and Edge stored the cookie as HttpOnly, Secure,
  Strict and sent it back. WebKit stored it with `sameSite: None` and did
  not send it back over `http://localhost`.
- **Learned:** `http://localhost` is a usable probe origin for Chromium and
  Firefox only. WebKit needs an HTTPS origin; Playwright's Windows WebKit is
  not evidence for Safari.

### 2. Concurrent first use with and without Web Locks — 2026-11-07
- **Tried:** Two tabs of one browser context without a marker call
  `POST /api/browser/ensure` at once; tab A's response is delayed 400 ms.
  Run once inside `navigator.locks.request('k3o-marker', ...)` and once
  without it.
- **Command:** `node probe.mjs locks chromium firefox chrome msedge`
- **Result:** With locks, all four minted exactly one marker and both tabs
  ended with it. Without locks, all four minted two markers; Firefox, Chrome
  and Edge kept the first (the delayed older response overwrote the newer
  cookie), Chromium kept the last.
- **Learned:** Unserialized first use is nondeterministic and a delayed
  response can overwrite a newer HttpOnly marker. Holding one exclusive Web
  Lock across the whole ensure request, including its response, produced a
  single marker in every tested browser.

### 3. Tab closed while its marker response is pending — 2026-11-07
- **Tried:** Tab A starts ensure (server delays 2.5 s) inside the lock; tab A
  is closed after 0.5 s, releasing the lock; tab B then ensures and mints a
  new marker; wait until after A's response is written.
- **Command:** `node probe.mjs closed-tab chromium firefox chrome msedge`
- **Result:** In all four, the server wrote A's Set-Cookie after the client
  had gone; B's marker remained current immediately and 3.5 s later.
- **Learned:** Closing the document cancels its pending ensure, and the late
  response is not applied. Not covered: a response whose headers arrive
  just before cancellation.

### 4. Connection dropped during ensure — 2026-11-07
- **Tried:** The server destroys the socket after 300 ms without a response,
  then the page retries ensure.
- **Command:** `node probe.mjs dropped chromium firefox chrome msedge`
- **Result:** The first fetch rejected; no marker was stored; the retry
  minted one that stayed current.
- **Learned:** An interrupted ensure leaves no cookie and is safe to retry
  under the lock; the server cannot know whether a written response was
  applied, so a marker is only trusted when the browser presents it again.

### 5. Live Cognito authorization-code flow through a landing page — 2026-11-07
- **Tried:** Inside the marker lock, ensure a Strict marker, `POST
  /api/sso/start` (sets a Lax `__Host-k3o-pre` cookie and returns the real
  managed-login URL with state, nonce and PKCE S256), sign in the test user
  on the real managed-login page, let Cognito redirect to
  `http://localhost:8443/auth/cognito/callback`, and have that static landing
  page `POST` its query to `/api/sso/complete` inside the lock. The server
  exchanged the code with confidential Basic authentication, replayed it,
  refreshed, revoked and refreshed again; then the browser followed
  `/logout?client_id=…&logout_uri=http://localhost:8443/` and started a new
  authorization.
- **Command:** `node probe.mjs cognito chromium`, then with
  `REFRESH_DELAY_MS=3000` for `firefox chrome msedge`. The app client was
  given `http://localhost:8443` callback and sign-out URLs for this probe.
- **Result (all four):** The callback navigation was `Sec-Fetch-Site:
  cross-site`, carried the Lax pre-auth cookie, **not** the Strict marker,
  and no Referer. The landing page's same-origin POST carried both, and both
  matched the attempt. The callback had exactly `code` and `state`.
  Exchange 200 returned `access_token, expires_in, id_token, refresh_token,
  token_type`; replaying the code returned 400 `invalid_grant`. The ID token
  had `iss` = configured issuer, `aud` = client ID, `token_use=id`, the
  original nonce, `cognito:groups` as an array containing `kafka3o-admins`,
  and `exp - iat = 3600`. Other claims: `at_hash, auth_time,
  cognito:username, email, email_verified, event_id, jti, origin_jti, sub`.
  Refresh 200 returned `access_token, expires_in, id_token, token_type`
  (no new refresh token), same `iss`/`sub`/`aud`, groups present, no nonce,
  unchanged `auth_time`. Revoke returned 200; refresh after revoke returned
  400 `invalid_grant`. Logout redirected to the sign-out URL, and the next
  authorization showed the credential form again.
- **Learned:** The Strict marker cannot be checked on the callback
  navigation itself; the callback must be completed by a same-origin request
  from the landing page. Without rotation configured, Cognito retains the
  original refresh token. A refreshed ID token omits the nonce.

### 6. Refreshed ID token issue time — 2026-11-07
- **Tried:** Compare refreshed `iat` with the original: Chromium refreshed
  immediately; Firefox, Chrome and Edge waited 3 s.
- **Result:** Immediately: not later (same second). After 3 s: later in all
  three.
- **Learned:** Cognito `iat` has one-second resolution. The existing
  strictly-later rule fails closed for a refresh within the same second as
  the previous token; the five-minute refresh cadence is unaffected.

## Recipe
1. **Marker cookie:** `__Host-kafka3o_browser` = 256-bit marker from
   `session.NewBrowserMarker`; `Secure; HttpOnly; Path=/; SameSite=Strict`;
   `Max-Age` 400 days. It is set by exactly one route and by no other
   response.
2. **Ensure:** `POST /api/session/browser` with a verified same-origin
   `Origin`. Exactly one valid marker → 204 without `Set-Cookie`. No marker
   field → mint, set, 204. Any malformed or duplicate marker field → 409 and
   no `Set-Cookie`: an existing value is never overwritten.
3. **Browser coordination:** the UI runs ensure, SSO start, callback
   completion and Cognito logout inside
   `navigator.locks.request("kafka3o-browser-marker", { mode: "exclusive" }, …)`
   and never aborts or times out those requests, so each response is applied
   or discarded before the lock is released. Without `navigator.locks` the UI
   does not offer SSO; local login is unchanged.
4. **Start:** inside the lock, ensure, then `POST /api/session/cognito/start`
   (verified `Origin`). Require one valid marker, reject a resolvable existing
   session with 409, call `StartBoundAuthorization(marker digest)`, set the
   Lax `__Host-kafka3o_sso` cookie and return the authorization URL as JSON;
   the UI then navigates the top-level window to it.
5. **Callback landing:** Cognito redirects to
   `<origin>/auth/cognito/callback?code=…&state=…`. That navigation carries the
   Lax pre-authentication cookie but not the Strict marker or session, so
   the server does not consume anything on it; the SPA's static
   `index.html` serves it. The SPA immediately replaces the URL with
   `/auth/cognito/callback` and, inside the lock, `POST`s the raw query string
   to `/api/session/cognito/callback`.
6. **Complete:** `POST /api/session/cognito/callback` (verified `Origin`)
   parses with `ParseBrowserCallback`, reads the transient and marker
   cookies, `ConsumeBoundAuthorization` (also for provider denial, audited),
   `ExchangeBoundAuthorizationCode`, `IssueBoundCognito`, sets the Strict
   session and CSRF cookies, clears the transient cookie and returns the
   session. Never log the body, query, code or cookies. Uncertain outcomes
   return a generic retry-sign-in error and are never retried automatically.
7. **Use and logout:** when a request presents a marker, resolve with the
   bound actions; a local unbound session still resolves through the
   existing path, which rejects bound sessions. Logout revokes locally first
   (bound for Cognito sessions) and returns the configured Cognito
   `/logout?client_id=…&logout_uri=<origin>/` URL only for Cognito sessions;
   the UI then navigates there.

## Facts
- Cognito managed login (Essentials, managed login v2): callback has exactly
  `code` and `state`; confidential Basic exchange works; code replay →
  400 `invalid_grant`; ID token lifetime 3600 s; `cognito:groups` is an
  array; refresh without rotation returns no new refresh token and an ID
  token without `nonce`, same `iss`/`sub`/`aud` and `auth_time`; revoke →
  200, then refresh → 400 `invalid_grant`; `/logout` clears the managed-login
  session and redirects to an allowed sign-out URL.
- Discovery serves the issuer and JWKS on `cognito-idp.<region>.amazonaws.com`
  and the authorize, token and logout endpoints on the login domain.
- Without serialization, delayed ensure responses overwrite newer markers in
  Firefox, Chrome and Edge; with one exclusive Web Lock held across the
  response, one marker results.

## Dead Ends
- Checking the Strict marker on the callback navigation: browsers omit it on
  the cross-site redirect.
- `http://localhost` as a WebKit probe origin: Secure cookies are not sent.

## Open Questions
- Real Safari and an HTTPS WebKit origin are not run; no supported-browser
  version floor is measured beyond the tested builds.
- A response whose headers arrive just before its document closes, and
  multiple browser profiles sharing cookies, are not run.
- Cognito group-change propagation timing and refresh-token rotation are not
  run.

## Spec Impact
- TECH-SPEC `## Stack`: `@playwright/test` 1.64.1 as a dev-only browser test
  runner (0 `npm audit` findings, 2026-11-07).
- TECH-SPEC M10 notes: record the recipe above and that it is the only
  marker setter; SSO requires Web Locks.
- P53: amend T53.4 into slices T53.4t–T53.4x before the umbrella task, and
  let T53.5 add an opt-in live-pool browser check.
