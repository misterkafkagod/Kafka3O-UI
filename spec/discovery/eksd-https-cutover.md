# Discovery: eksd-https-cutover
- **Goal:** Find how the secured M10 stack (Console, secured Gateways, secured UI) replaces the `kafka3o-manual` test deployment on `eksd-01` without browser certificate warnings, trust-store changes or any change to the Kafka clusters.
- **Done when:** the live layout, the browser cookie behavior on `http://localhost`, the storage and binary delivery facts and a cutover/rollback recipe are recorded.
- **Phase:** P59
- **Status:** Done
- **Driven by:** Claude under the user's standing M10 auto-approval and explicit cutover choice (2026-11-08). Read-only inspection of the cluster; local throwaway probe only.
- **Secrets used:** none read. Kafka SASL/TLS material stays in the existing `kafka-a-security`/`kafka-b-security` Secrets.

## Log
### 1. Live manual deployment layout — 2026-11-08
- **Tried:** reading `deploy/kafka3o-manual` structure (no secret values).
- **Command:** `kubectl -n kafka3o-test-clusters get deploy kafka3o-manual -o json` summarized locally.
- **Result:** one pod pinned to `eksd-01`, uid/gid 1000, `fsGroup` 1000, read-only root FS, all capabilities dropped. Init containers unpack the UI from ConfigMap `kafka3o-manual-ui` (`site.tar.gz`, `config.json`) and generate a per-pod bearer token and self-signed loopback certificate per Gateway into memory volumes. `gateway-a`/`gateway-b` (image `apache/kafka:4.3.1`, binary host-path mounted from `/var/lib/kafka3o-manual-2614e6a78d51/gateway-…`) listen on pod loopback `8081`/`8082` with SASL/TLS Kafka settings from the Secrets. The `ui` container runs the Go manual proxy on `5173`, serving the UI and injecting tokens. Users reach `http://localhost:5173` through `kubectl port-forward` over SSH. Cluster IDs are `kafka-a` (Kafka A, 8081) and `kafka-b` (Kafka B, 8082).
- **Learned:** the whole UI/Gateway layer is one replaceable pod; Kafka StatefulSets, PVs and Secrets are separate and need no change. Only port 5173 must be forwarded after the cutover.

### 2. `__Host-` Secure cookies on `http://localhost` — 2026-11-08
- **Tried:** whether Chromium keeps the Console's cookies when the page is served from `http://localhost` (as today) instead of HTTPS.
- **Command:** `spec/discovery/eksd-https-cutover/localhost-cookie-probe.mjs` with Playwright and the cached Chromium 1194 (the approved real-browser cookie check).
- **Result:**
  ```json
  {"secureContext": true, "readableCookie": "__Host-kafka3o_csrf=c1",
   "checkRequestCookie": "__Host-kafka3o_session=s1; __Host-kafka3o_csrf=c1",
   "fetchOrigin": "http://localhost:5299", "fetchCookie": "__Host-kafka3o_session=s1; __Host-kafka3o_csrf=c1", "fetchStatus": 200}
  ```
- **Learned:** `http://localhost` is a secure context; `__Host-…; Secure; HttpOnly; SameSite=Strict` cookies are stored, sent on navigation and same-origin `fetch`, and the HttpOnly one stays hidden. A loopback front that serves the secured UI and relays `/api/*` to the Console's HTTPS loopback listener (verifying its certificate) keeps today's warning-free access. Because the browser's Origin is `http://localhost:5173` while the Console's configured origin must be HTTPS, the front must check the browser Origin/Host itself and present the Console's origin upstream.

### 3. Storage, binaries and tooling — 2026-11-08
- **Tried:** where binaries and durable data can live.
- **Command:** `ls -ld /var/lib/kafka3o-manual-*`, `sudo -n true`, `cat deploy/kubernetes/test-kafka/storage.yaml`, Console CLI usage.
- **Result:** binaries are root-owned, read-only files in `/var/lib/kafka3o-manual-<hash>/`; passwordless `sudo` works on `eksd-01`; Kafka PVs are static `local` PVs with `Retain` and node affinity to `eksd-01`; the Console CLI supports `bootstrap` and `serve`, and storage already has a backup action.
- **Learned:** deliver static `linux/amd64` binaries (Gateway, Console, front) to a new hash directory; give the Console its own `local` PV (`/var/lib/kafka3o-console`, uid 1000, mode 0700); add a CLI backup command to exercise SQLite-consistent backup/restore.

## Recipe
1. Export the current Deployment and UI ConfigMap as the rollback copy (outside git; no secrets in them).
2. Build static `linux/amd64` Gateway, Console and front binaries and the secured UI bundle; copy binaries to a new `/var/lib/kafka3o-manual-<hash>/`.
3. Create the Console PV/PVC (`kafka3o-console-data`) and a ConfigMap with the cluster registry (`kafka-a`, `kafka-b` at `https://127.0.0.1:8081/8082`) and the UI bundle.
4. Replace the pod spec: an init container generates a per-pod service CA (ECDSA P-256) and certificates with exact URI SANs (`spiffe://kafka3o/console`, `spiffe://kafka3o/gateway/kafka-a|kafka-b`, IP SAN 127.0.0.1) into memory volumes; Gateways run in secured mode without tokens; the Console serves loopback HTTPS 8443 and policy mTLS 9443 with forwarding enabled; the front serves the UI on 5173 and relays `/api`.
5. Bootstrap once with a generated secret and password piped to `kafka3o-console bootstrap` (never stored in git or logs), complete the first password change, then classify `kafka-a`/`kafka-b` and grant nothing else.
6. Verify through the forwarded `http://localhost:5173` with Chromium: sign-in, cluster list, reads, Production badge, ADMIN write with reason to `kafka3o-m10-verify`, OPERATOR denial, audit search/export, restart persistence, backup/restore.
7. Rollback: re-apply the exported Deployment; Kafka data is untouched either way.

## Facts
- Namespace `kafka3o-test-clusters`; node `eksd-01`; pod security uid/gid 1000, read-only root FS.
- Kafka: `kafka-a`/`kafka-b` StatefulSets with SASL/TLS, credentials in Secrets; PVs `kafka3o-test-a/b` (Retain).
- Browser access: `kubectl port-forward deployment/kafka3o-manual 5173` over SSH; Chromium treats `http://localhost` as secure.

## Dead Ends
- Serving the Console directly to the browser over HTTPS with the per-pod certificate would require accepting a certificate warning or changing browser trust, which the tech spec forbids.
- Playwright's bundled browser version did not match the cached build and Chrome is not installed on this Mac; the cached Chromium 1194 executable works.

## Open Questions
- Which cluster is Production: `kafka-b` matches `prod` in the sample UI config (8082) and is assumed until the user confirms.
- Real Cognito remains disabled (no User Pool).

## Spec Impact
- TECH-SPEC: record the loopback front, per-pod service CA, Console PV and cutover/rollback in the M10 migration section during P59.
- ROADMAP: P59 stays one phase.
