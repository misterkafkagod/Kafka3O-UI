# P59 · F27–F31 — End-to-end regression, migration and secure manual deployment
- **Milestone:** M10
- **Covers:** release integration of F27–F31
- **Discovery:** [eksd-https-cutover](../discovery/eksd-https-cutover.md)
- **Status:** Review

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
