# P83 · F41-B1 + F41-B4 — Metrics tab with broker disk use
- **Milestone:** M15
- **Covers:** F41-AC1, F41-AC4
- **Discovery:** [cluster-metrics-sources](../discovery/cluster-metrics-sources.md)
- **Status:** Done

## Demo
1. In the Gateway repository, run `go test ./internal/metrics ./internal/kafka -run "LogDirs|Metrics"`, `go test ./internal/httpapi -run Metrics`, `go test ./internal/gatewayauth ./internal/authorization ./cmd/gateway`.
2. In the browser, a cluster's Metrics tab shows one row per broker and log directory with total, used, free (with % used) and Kafka data size, refreshed every 10 seconds; an unreported size reads "Unknown"; a failing log directory read shows "Unavailable: <reason>".
3. On EKS-D after deployment: Kafka A's tab shows its `/var/lib/kafka/data` volume.

## Tasks
- [x] **T83.1 Gateway metrics read with log directories** — Covers: F41-AC1, F41-AC4
  - Files: Gateway internal/metrics/metrics.go (new, data types), internal/metrics/get_metrics.go (new, with test), internal/metrics/compare_log_dirs.go (new, with test), internal/metrics/read_log_dirs.go (new, port), internal/kafka/read_log_dirs.go (new, with test), internal/httpapi/register_get_metrics.go (new, with test), internal/authorization/policy.go, internal/authorization/classify_action.go, internal/authorization/evaluate_policy_test.go, internal/gatewayauth/route_actions.go, internal/gatewayauth/classify_route_test.go, cmd/gateway/gateway_routes.go, cmd/gateway/main.go, cmd/gateway/route_catalog_test.go
  - Do: `ReadLogDirs` (kadm `DescribeAllLogDirs(nil)`) returns per broker and directory the volume's total and usable bytes (nil when Kafka reports -1), the sum of partition replica sizes and the directory's error; partial results are kept with the request error. `GetMetrics` applies the Kafka timeout, sorts directories by broker then path, stamps `readAt` and puts a failed read into `logDirs.error` instead of values. `GET /api/v1/metrics` is a new cluster read `cluster.metrics.read` (VIEWER, not audited).
  - Done when: `go test ./internal/metrics ./internal/kafka ./internal/httpapi ./internal/authorization ./internal/gatewayauth ./cmd/gateway` (per package) passes, covering unknown sizes, a directory error, a failed request and the route's policy action; then `go test ./...` passes.
- [x] **T83.2 Metrics tab with disk use** — Covers: F41-AC1, F41-AC4
  - Files: UI src/gateway/getMetrics.ts (new, with test), src/hooks/useMetrics.ts (new), src/components/ClusterMetrics.tsx (new, with test), src/components/BrokerDiskUse.tsx (new, with test), src/components/BrokerDiskUse.module.css (new), src/components/ClusterTabs.tsx, src/components/ClusterTabs.test.tsx, src/pages/ClusterPage.tsx, src/App.tsx, src/main.tsx, src/components/AppShell.tsx, src/components/AppShell.test.tsx
  - Do: `getMetrics` reads `GET /api/v1/metrics`; `useMetrics` refreshes every 10 seconds. A "Metrics" cluster tab (`/clusters/:id/metrics`, breadcrumb "Metrics") shows `BrokerDiskUse`: Broker, Log directory, Total, Used, Free, % used, Kafka data, with `formatBytes`; unknown sizes read "Unknown"; a directory error and a section error read "Unavailable: <reason>"; Gateway errors use `ErrorWithRetry`.
  - Done when: `npx vitest run src/gateway/getMetrics.test.ts src/components/BrokerDiskUse.test.tsx src/components/ClusterMetrics.test.tsx src/components/ClusterTabs.test.tsx src/components/AppShell.test.tsx` passes; then `npm test` and `npm run build` pass.

## Review
- **Demo:** steps 1–2 passed (auto-approved under the user's standing M15 instruction, 2026-11-10; run by Claude). Gateway: unknown sizes become null, directory and request errors stay in their section with partial results, `cluster.metrics.read` is a VIEWER read and the route catalog now has 31 operations. Browser, Chromium 1194 with a synthesized Gateway (`m15-demo`, 10/10): the Cluster sections tabs open Metrics with the breadcrumb Clusters / Dev / Metrics; broker 1 shows 88.0 GB total, 13.8 GB used, 74.2 GB free, 15.7% used, 198.8 KB Kafka data; broker 2's directory error reads "Unavailable: KAFKA_STORAGE_ERROR". Step 3 (EKS-D) waits for a deploy.
- **Regression:** Gateway `go test ./...` passed; UI `npm test` passed; `npm run build` passed.
- **Convention check:** one action per file (`read_log_dirs` adapter and port, `get_metrics`, `compare_log_dirs`, `register_get_metrics`; UI `getMetrics`, `useMetrics`, `BrokerDiskUse`, `ClusterMetrics`).
- **Vulnerability scan (milestone close, 2026-11-10):** no new dependencies in either repository (the probe module under `discovery/cluster-metrics-sources/probe` is throwaway and not built into either product); UI `npm audit`: 0; Gateway `govulncheck@v1.9.0 -test -tags integration ./...`: 0 called, 1 uncalled in a required module (GO-2026-5932, unchanged).
