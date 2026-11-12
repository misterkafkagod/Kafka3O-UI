# Discovery: cli-console-session
- **Goal:** Confirm a non-browser client can sign in to the secured Console, read clusters and Gateway data through it, send writes, and sign out, and how a laptop reaches it.
- **Done when:** sign-in, `/api/session`, `/api/clusters`, a Gateway call, a refused wrong password, sign-out with CSRF and refused reuse are run live with `curl`.
- **Phase:** P99 (and P100)
- **Status:** Done
- **Secrets used:** the `admin` local password, passed through an environment variable into a 0600 request file that was deleted at once; session cookies kept in a 0700 scratch directory and deleted. Never printed (cookie values redacted).

## Log
### 1. How the Console is reached — 2026-11-12
- **Tried:** read the secured deployment and the front proxy.
- **Result:** the Console listens on `127.0.0.1:8443` inside the pod with `KAFKA3O_CONSOLE_ORIGIN=https://127.0.0.1:8443`; the front proxy serves the UI on `:5173` and relays `/api/...` only for `Host: localhost:5173` with no `Origin` or `Origin: http://localhost:5173`, rewriting `Origin` to the Console's. Laptops reach it through the usual port-forward to `http://localhost:5173`.
- **Learned:** the CLI uses the same base URL as the browser (`http://localhost:5173`) and sends `Origin: http://localhost:5173` on POST/PUT/DELETE.

### 2. Sign in — 2026-11-12
- **Request:** `POST http://localhost:5173/api/session/local`, `Origin: http://localhost:5173`, JSON `{"username","password"}`.
- **Result:** 200, body `{"accountId","username":"admin","authSource":"local","mustChangePassword":false,"absoluteExpiresAt":"2026-11-12T20:06:33Z"}`; cookies `__Host-kafka3o_session` (HttpOnly, Secure, SameSite=Strict) and `__Host-kafka3o_csrf` (Secure), both expiring after 8 hours.
- **Learned:** the CLI keeps both cookie values and the expiry; it must send them itself (Go's cookie jar does not send Secure cookies over `http://localhost`).

### 3. Reads — 2026-11-12
- **Request:** `GET /api/session`, `GET /api/clusters`, `GET /api/clusters/{kafka-a,kafka-b}/gateway/api/v1/cluster` with both cookies.
- **Result:** session adds `"administration":{"access":true,"audit":true}`; clusters `[{"id":"kafka-a","name":"Kafka A","environment":"NON_PRODUCTION","effectiveRole":"ADMIN"},{"id":"kafka-b","name":"Kafka B","environment":"PRODUCTION","effectiveRole":"ADMIN"}]`; each Gateway answers its `/api/v1/cluster` JSON (`clusterId`, `controllerId`, `brokers`). Without cookies: 401 `{"code":"unauthorized"}`.
- **Learned:** every Gateway path the UI uses is `/api/clusters/{id}/gateway` + the Gateway path; reads need only the cookies.

### 4. Errors, sign-out and reuse — 2026-11-12
- **Request:** wrong password; `POST /api/session/logout` without and with `X-Kafka3O-CSRF: <csrf cookie value>`; `GET /api/clusters` with the old cookies.
- **Result:** wrong password 401 `authentication_failed`; logout without the header 403 `csrf_rejected`; with it 204 and both cookies cleared; old cookies afterwards 401 `unauthorized`.
- **Learned:** writes need `Origin` and `X-Kafka3O-CSRF` = the CSRF cookie value; a signed-out session cannot be reused.

### 5. Other sign-in outcomes (code) — 2026-11-12
- **Tried:** read `local_login.go` and `authorize_session.go` instead of changing an account.
- **Result:** a disabled account is also `authentication_failed`; throttling is 429 `authentication_throttled`; signing in while sending a session cookie is 409 `already_signed_in`; with `mustChangePassword: true` the login succeeds but every other call is 403 `password_change_required`.
- **Learned:** the CLI signs in without cookies, and on `mustChangePassword` signs the new session out again and stores nothing.

## Recipe
1. Base URL = the console URL the user gives (EKS-D: `http://localhost:5173` through the port-forward); `Origin` = that URL's scheme://host[:port].
2. Sign in: `POST /api/session/local` with `Origin`, no cookies → keep `__Host-kafka3o_session`, `__Host-kafka3o_csrf` and `absoluteExpiresAt` in the session file (0600). If `mustChangePassword`, sign out (step 5) and stop.
3. Reads: send `Cookie: __Host-kafka3o_session=…; __Host-kafka3o_csrf=…`; clusters from `GET /api/clusters`; Gateway data from `/api/clusters/{id}/gateway<gateway path>`.
4. Writes: also `Origin` and `X-Kafka3O-CSRF: <csrf cookie value>`.
5. Sign out: `POST /api/session/logout` as a write; 204 → delete the file.
6. Any 401 `unauthorized` → the session is over: delete the file, exit 3.

## Facts
- Error codes: `authentication_failed` (401), `authentication_throttled` (429), `already_signed_in` (409), `unauthorized` (401), `csrf_rejected` (403), `password_change_required` (403).
- Session lifetime: 8 hours absolute (`absoluteExpiresAt`).
- `/api/clusters` gives `environment` (`PRODUCTION`/`NON_PRODUCTION`) and `effectiveRole` per cluster.

## Dead Ends
- Relying on a cookie jar: Secure cookies are not sent over `http://localhost` by Go's jar.

## Open Questions
- None for M18.

## Spec Impact
- TECH-SPEC CLI integration: replace `discovery needed` with this recipe; `golang.org/x/term` version fixed.
- FUNC-SPEC F60-AC2: unchanged (a required password change ends the new session and stores nothing).
