# Discovery: gateway-service-trust
- **Goal:** Define and prove, with local standard-library prototypes, how the Console authenticates to each Gateway and each Gateway to the Console policy API, how a single-use delegation is bound to the exact request, and the timeout budget.
- **Done when:** service identity, request canonicalization and the latency/timeout budget are each demonstrated by a passing throwaway prototype, and a recipe P55 can implement exists.
- **Phase:** P55
- **Status:** Done
- **Driven by:** Claude under the user's standing M10 auto-approval (2026-11-08); local prototypes only, no external services or secrets.
- **Secrets used:** none. Prototypes generate throwaway in-memory CAs and keys.

## Log
### 1. Mutual TLS with URI-SAN service identities — 2026-11-08
- **Tried:** whether stdlib `crypto/tls` alone can authenticate the Console to a Gateway (and vice versa) by a deployment CA plus an exact URI SAN, rejecting every other certificate before HTTP.
- **Command:** `go test -v -count=1 ./...` in `discovery/gateway-service-trust/` (`mtls_identity_test.go`). The server uses `ClientAuth: tls.RequireAndVerifyClientCert`, `ClientCAs` = service CA and a `VerifyPeerCertificate` hook requiring exactly one URI SAN `spiffe://kafka3o/console`; the client pins the server URI `spiffe://kafka3o/gateway/prod` the same way, with TLS 1.3 and normal hostname verification.
- **Result:**
  ```text
  console identity: accepted as spiffe://kafka3o/console
  no client certificate: rejected (remote error: tls: certificate required)
  untrusted CA:          rejected (remote error: tls: certificate required)
  other service identity: rejected (remote error: tls: bad certificate)
  expired:               rejected (remote error: tls: expired certificate)
  server-auth only usage: rejected (remote error: tls: bad certificate)
  PASS (0.02s)
  ```
- **Learned:** stdlib mTLS with a dedicated service CA and exact URI-SAN pinning is sufficient; no dependency is needed. Go's client withholds a certificate whose issuer is not in the server's acceptable-CA list, so a foreign-CA client looks like "no certificate" (both are rejected during the handshake). Extended key usage `clientAuth` is enforced for clients. The verified peer URI is available to handlers as `r.TLS.PeerCertificates[0].URIs[0]`.

### 2. Canonical request binding — 2026-11-08
- **Tried:** a digest the Console computes for the request it builds and the Gateway recomputes from what it actually received, to bind a delegation to cluster, method, path, query and body.
- **Command:** `go test -v -count=1 -run Canonical ./...` (`canonical_request_test.go`). Binding v1 = `SHA-256("kafka3o-delegation-v1\n" + clusterID + "\n" + METHOD + "\n" + r.URL.EscapedPath() + "\n" + r.URL.Query().Encode() + "\n" + hex(SHA-256(body)))`, sent over a real `httptest` round trip.
- **Result:**
  ```text
  search with spaces, unicode, & and +: match=true
  proxy reorders query parameters:      match=true
  produce JSON body:                    match=true
  body changed:                         match=false
  body re-serialized with spaces:       match=false
  different topic / method changed / extra query parameter: match=false
  empty body equals no body:            match=true
  duplicate query keys keep value order (["1","2"] != ["2","1"])
  PASS
  ```
- **Learned:** `url.Values.Encode()` sorts keys, so reordered parameters still match while added, removed or changed values do not; percent-encoding of spaces, `&`, `+` and UTF-8 round-trips. The body binding is over exact bytes, so the Console must forward the exact bytes it hashed and never re-serialize. Duplicate keys preserve value order, so the Console must reject duplicate query keys before binding. Kafka topic names (`[A-Za-z0-9._-]`) need no path escaping; `EscapedPath` keeps the binding exact anyway.

### 3. End-to-end delegation flow and timeout budget — 2026-11-08
- **Tried:** Console mints a 32-byte single-use handle bound to the canonical request, forwards `DELETE /api/v1/topics/orders` to the Gateway over mTLS with `X-Kafka3O-Delegation`; the Gateway recomputes the binding and consumes the handle at a Console policy endpoint over a second mTLS channel (1 s budget) before its "Kafka" step.
- **Command:** `go test -v -count=1 -run Delegation ./...` (`delegation_flow_test.go`); 200 warm iterations on loopback, then replay, wrong-target, expired (1 ms lifetime), missing-handle and slow-policy (1.5 s) cases.
- **Result:**
  ```text
  cold (two mTLS handshakes): 5.351ms; warm p50=148µs p99=326µs max=662µs
  replay/wrong target/expired/missing: 403; slow policy (1.5 s) with 1 s Gateway budget: 503 after 1.001s
  Kafka action ran only for the single allowed request
  PASS (1.55s)
  ```
- **Learned:** with keep-alive both mTLS hops add well under a millisecond locally; only first connections pay the handshake. Atomic consume (delete-then-check under one lock; one transaction in SQLite) makes replay impossible even for concurrent duplicates. A bounded policy call turns a slow or unavailable policy service into a distinct 503 without touching Kafka.

## Recipe
1. **Service PKI:** a deployment-managed service CA, separate from the browser-facing TLS chain, issues ECDSA P-256 certificates with exactly one URI SAN: `spiffe://kafka3o/console` (client and policy-server certificates) and `spiffe://kafka3o/gateway/<clusterID>` (Gateway server and client certificates). Every hop uses TLS 1.3, `RequireAndVerifyClientCert` with the service CA, normal hostname verification and a `VerifyPeerCertificate` check of the exact peer URI SAN. Keys and certificates come from files named by environment variables; nothing is hard-coded.
2. **Console policy listener:** a separate mTLS listener (the browser listener cannot require client certificates) serving `POST /internal/v1/delegations/consume`. It maps the caller's URI SAN to the cluster ID it may act for and rejects any other identity.
3. **Mint:** for an authenticated, CSRF-checked browser request, the Console validates the registered target cluster and the requested route, rejects duplicate query keys, reads the body once (bounded), computes binding v1 = `SHA-256("kafka3o-delegation-v1\n" + clusterID + "\n" + METHOD + "\n" + escapedPath + "\n" + query.Encode() + "\n" + hex(SHA-256(body)))`, stores only `SHA-256(handle)` with the session, cluster, action, binding, optional Production reason and a ≤30 s expiry, and returns nothing to the browser.
4. **Forward:** the Console sends the exact hashed bytes to the registered Gateway URL over mTLS with `X-Kafka3O-Delegation: <43-char base64url handle>`, after stripping every client `X-Kafka3O-*`, `Authorization` and forwarding header. No retry for any mutation.
5. **Gateway secured mode:** an explicit configuration mode accepts only Console mTLS (no bearer token, no CORS browser access); anonymous `GET /api/v1/health/live` stays open. A route table maps each method + path template to a P49 action; unknown routes are denied. The Gateway recomputes the binding from the received request, then calls consume with `{handle, binding, action, resource}` within 1 s.
6. **Consume:** in one SQLite transaction the Console deletes the delegation by digest, checks the caller's cluster, expiry, binding and action, re-resolves the session's current grants and the cluster's current classification, evaluates P49 policy, and returns `{allowed, actorId, source, denial}`. Missing/invalid delegation → 401; valid but forbidden → 403; storage or timeout → 503. Only `allowed` lets the Gateway call Kafka.
7. **Timeout budget:** Gateway policy call 1 s + Kafka 3 s (existing) + outcome audit 1 s (P57) = 5 s Gateway budget; Console→Gateway forward 6 s; browser→Console secured requests 8 s. Delegation lifetime 30 s covers queueing but never retries.

## Facts
- Header: `X-Kafka3O-Delegation`, 32 random bytes as unpadded base64url (43 chars). Stored only as SHA-256.
- Peer identity: `r.TLS.PeerCertificates[0].URIs[0]` after verified handshake; Go rejects expired and wrong-EKU certificates during the handshake.
- Canonical query: `url.Values.Encode()` (sorted keys); topic names need no escaping, but the binding uses `EscapedPath()` to stay exact.
- Measured locally: cold 5.4 ms, warm p50 0.15 ms, p99 0.33 ms for both hops together.

## Dead Ends
- Re-serializing JSON bodies at the Console: any whitespace or key-order difference breaks the binding; forward the exact bytes.
- Accepting duplicate query keys: value order is significant in `Encode()`, so either reject duplicates or every hop must preserve order; rejecting is simpler.
- A single Console listener for browsers and Gateways: browsers cannot present client certificates, so the policy API needs its own mTLS listener.

## Open Questions
- Certificate issuance and rotation on EKS-D (cert-manager, a manual CA or a Kubernetes Secret per Gateway) is a P59 deployment decision; the code only reads files and must reload or restart on rotation.
- Production change reasons: P56 adds the reason to the mint request; P55 binds an empty reason and P49 policy denies Production mutations without one.
- Outcome audit after the Kafka call is P57; P55 records the decision only.

## Spec Impact
- TECH-SPEC `## M10 … Browser → Console → Gateway trust flow`: replace "precise API/header names … require discovery" with the recipe's header, URI-SAN identities, binding v1, separate policy listener and timeout budget. No new dependency.
- TECH-SPEC `## Integrations`: add the service CA files and environment variables (named in P55's plan).
- FUNC-SPEC: no behavior change.
- ROADMAP: P55 is too large for one phase. Split into **P55** (Console policy API and Gateway secured-mode enforcement: F29-AC1, F29-AC2, F30-AC2) and **P62** (Console request forwarding and the secured UI path: F29-AC3, F29-AC4), with P62 before P56.

