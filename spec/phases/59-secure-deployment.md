# P59 · F27–F31 — End-to-end regression, migration and secure manual deployment
- **Milestone:** M10
- **Covers:** release integration of F27–F31
- **Discovery:** [eksd-https-cutover](../discovery/eksd-https-cutover.md)
- **Status:** Done

## Existing baseline and boundaries
P49–P58 implement and test every M10 component, but the EKS-D manual
deployment still uses shared Gateway tokens. The user chose a direct cutover
(2026-11-08): the `kafka3o-manual` pod is replaced by the secured stack; the
Kafka StatefulSets, PVs and Secrets are not changed. Decisions: only
`kafka-b` (Kafka B, the "prod" cluster) is Production, `kafka-a` is
non-Production; Claude generates a permanent local administrator for the
user; real writes are allowed only to the synthetic topic
`kafka3o-m10-verify`. Cognito stays disabled (no User Pool).

## Demo
1. Through the forwarded `http://localhost:5173`, Chromium shows the Console
   sign-in; the administrator signs in and sees Kafka A (Non-production) and
   Kafka B (Production) with live cluster data.
2. A grant-free user sees no clusters; an OPERATOR writes to
   `kafka3o-m10-verify` on Kafka A and is denied on Kafka B; the ADMIN writes
   on Kafka B with a reason; audit shows correlated intents and outcomes.
3. Direct Gateway calls with the old token are refused; the Console restarts
   with identities, grants and audit intact; a SQLite backup restores; the
   rollback manifest restores the old deployment and the secured one is
   re-applied; Kafka data and volumes are unchanged throughout.

## Tasks
- [x] **T59.1 Loopback Console front** — Covers: F27, F29 (browser path)
  - Files: Gateway `deploy/kubernetes/secured-test/front/` (new: main, handler, tests).
  - Do: Serve the secured UI on `127.0.0.1:5173` with SPA fallback and relay
    `/api/*` to the Console's HTTPS loopback origin, verifying its certificate
    from the pod CA. Accept only `Host: localhost:5173` and, when present,
    `Origin: http://localhost:5173`, then present the Console origin upstream;
    strip forwarding headers; never follow redirects.
  - Done when: `go test ./deploy/kubernetes/secured-test/front` passes.
- [x] **T59.2 Console backups** — Covers: F31 (backup/restore)
  - Files: Gateway `cmd/console/maintain_backups.go` (new), `cmd/console/run_serve.go` and tests.
  - Do (amended 2026-11-08: the store's exclusive lock rules out a separate
    backup command while serving): with `KAFKA3O_CONSOLE_BACKUP_DIR` the
    running Console writes a SQLite-consistent owner-only snapshot at start and
    every 24 h and keeps the newest 7; failures are logged alerts. Restore =
    stop the Console and copy a snapshot over the database file.
  - Done when: `go test ./cmd/console -run 'Backup'` passes, including a
    snapshot reopening with its data.
- [x] **T59.3 Secured deployment manifests and scripts** — Covers: release integration
  - Files: Gateway `deploy/kubernetes/secured-test/` (README, `storage.yaml`,
    `deployment.yaml`, `prepare-service-pki.sh`, `clusters.json`, `deploy.sh`).
  - Do: Console PV/PVC, registry ConfigMap, per-pod service PKI init,
    secured Gateways, Console (8443 browser, 9443 policy, forwarding), front,
    and a script that builds binaries and the secured UI, delivers them,
    exports the rollback copy and applies the change.
  - Done when: `kubectl apply --dry-run=server` accepts the manifests and the
    PKI script produces certificates the Go loaders accept.
- [x] **T59.4 Cutover, bootstrap and live verification** — Covers: F27–F31
  - Files: Gateway `deploy/kubernetes/secured-test/README.md`, UI
    `spec/TECH-SPEC.md`, `spec/discovery/eksd-https-cutover/verify-secured.mjs` (new).
  - Do: Apply the cutover, bootstrap the administrator (credentials given to
    the user only), classify, create verification users, run the Chromium
    verification through the port-forward, exercise restart persistence,
    backup/restore and the rollback round trip, and confirm the Kafka pods and
    PVs are unchanged.
  - Done when: the verification script passes against EKS-D and the checks
    above are recorded.

## Review
- **Demo:** passed on EKS-D (auto-approved under the user's standing M10
  instruction and explicit cutover decision, 2026-11-08; run by Claude through
  the forwarded `http://localhost:5173` with Chromium 1194, not observed live by
  the user). `verify-secured.mjs` passed 23/23 after the cutover and 22/22 after
  the rollback round trip: cookie-only sessions (`HttpOnly`, `Secure`,
  `Strict`), Kafka B "Production" and Kafka A "Non-production" with live
  cluster data, the pre-existing `tert` topic intact, Production topic
  creation and produce denied without a reason and allowed for ADMIN with one,
  OPERATOR allowed on Kafka A and denied on Kafka B, OPERATOR denied audit,
  the role-free user seeing no clusters, correlated intent/`confirmed` outcome
  with the reason, classification audited, scoped CSV export, and the old
  `/manual/gateways/*` path serving only the UI shell. A direct Gateway call
  with a bearer token returned `401 service_authentication_required`; another
  service's certificate failed the TLS handshake.
- **Persistence, backup and rollback:** identities, grants, classification
  and audit survived three pod replacements; a daily snapshot reopened with
  the Console storage code (bootstrap verified, 40 audit events, both
  classifications); `rollback.sh` restored the shared-token pod (3/3, both
  clusters readable) and `deploy.sh` re-applied the secured stack against the
  same database. Kafka pods kept their UIDs, start times and 0 restarts; PVs
  unchanged; writes only to `kafka3o-m10-verify` on both clusters.
- **Issues found and fixed during deployment:** Console clients rejected the
  `http://localhost` secure-context origin (now accepted for exactly
  `localhost`); identical pod templates did not roll out a new UI (UI bundle
  hash annotation); `fsGroup` re-chmodded the owner-only database on restart
  (`fsGroupChangePolicy: OnRootMismatch` with a 2770 volume root; one snapshot
  written before the fix was reset to 0600); `kubectl apply` would have merged
  into the old spec (`kubectl replace`).
- **Plan deviation:** T59.2 became in-process daily backups (store lock).
- **Vulnerability scan:** `npm audit`: 0 findings; `govulncheck@v1.9.0 -test
  -tags integration ./...`: 0 called, 1 uncalled module advisory
  (GO-2026-5932, integration tooling only), within policy.
- **Regression:** full Gateway suite, deploy tooling tests, UI suite 436 passed
  (5 opt-in skipped), default/preview/secured builds.
- **Not run:** real Amazon Cognito (no User Pool; SSO stays disabled), the
  user's own Chrome on their PC, multi-broker or HA behavior.

