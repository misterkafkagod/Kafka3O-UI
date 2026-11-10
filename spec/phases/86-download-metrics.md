# P86 · F53-B1 — Download metrics
- **Milestone:** M15
- **Covers:** F53-AC1
- **Discovery:** —
- **Status:** Done

## Demo
1. Run `npx vitest run src/metrics src/components/MetricsDownload.test.tsx src/components/ClusterMetrics.test.tsx`.
2. In the browser, Download JSON and Download CSV on the Metrics tab save `<cluster>-metrics-<UTC time>.json` and `.csv` with the tab's values and the read time; unavailable values are empty.

## Tasks
- [x] **T86.1 Download JSON and CSV** — Covers: F53-AC1
  - Files: UI src/metrics/metricsToCsv.ts (new, with test), src/metrics/escapeCsvField.ts (new, with test), src/metrics/metricsFileName.ts (new, with test), src/metrics/saveFile.ts (new, with test), src/components/MetricsDownload.tsx (new, with test), src/components/ClusterMetrics.tsx, src/components/ClusterMetrics.test.tsx
  - Do: `metricsToCsv` writes `metric,broker,logDir,topic,value` rows for the read time, each log directory's sizes, the partition counts, topic sizes and end-offset sums, leaving unavailable values empty; `escapeCsvField` quotes fields with commas, quotes or line breaks. `metricsFileName` builds `<cluster>-metrics-<UTC time>.<ext>` with unsafe characters replaced. `saveFile` saves through a `Blob` and a temporary object URL. `MetricsDownload` offers both buttons for the last response, with no extra request.
  - Done when: `npx vitest run src/metrics src/components/MetricsDownload.test.tsx src/components/ClusterMetrics.test.tsx` passes; then `npm test` and `npm run build` pass.

## Review
- **Demo:** steps 1–2 passed (auto-approved under the user's standing M15 instruction, 2026-11-10; run by Claude). Browser: Download JSON saved `dev-metrics-2026-11-10T12-00-10Z.json` with the response and `readAt`; Download CSV saved the `.csv` with `metric,broker,logDir,topic,value` rows, the unknown below-min-ISR count and the failing directory's values empty.
- **Regression:** UI `npm test` 587 passed (5 opt-in skipped); `npm run build` passed.
- **Convention check:** `metricsToCsv`, `escapeCsvField`, `metricsFileName`, `saveFile` (injected into `ClusterMetrics`), `MetricsDownload`.
- **Vulnerability scan (milestone close, 2026-11-10):** no new dependencies in either repository (the probe module under `discovery/cluster-metrics-sources/probe` is throwaway and not built into either product); UI `npm audit`: 0; Gateway `govulncheck@v1.9.0 -test -tags integration ./...`: 0 called, 1 uncalled in a required module (GO-2026-5932, unchanged).
