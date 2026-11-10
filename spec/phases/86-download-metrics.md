# P86 · F53-B1 — Download metrics
- **Milestone:** M15
- **Covers:** F53-AC1
- **Discovery:** —
- **Status:** Review

## Demo
1. Run `npx vitest run src/metrics src/components/MetricsDownload.test.tsx src/components/ClusterMetrics.test.tsx`.
2. In the browser, Download JSON and Download CSV on the Metrics tab save `<cluster>-metrics-<UTC time>.json` and `.csv` with the tab's values and the read time; unavailable values are empty.

## Tasks
- [x] **T86.1 Download JSON and CSV** — Covers: F53-AC1
  - Files: UI src/metrics/metricsToCsv.ts (new, with test), src/metrics/escapeCsvField.ts (new, with test), src/metrics/metricsFileName.ts (new, with test), src/metrics/saveFile.ts (new, with test), src/components/MetricsDownload.tsx (new, with test), src/components/ClusterMetrics.tsx, src/components/ClusterMetrics.test.tsx
  - Do: `metricsToCsv` writes `metric,broker,logDir,topic,value` rows for the read time, each log directory's sizes, the partition counts, topic sizes and end-offset sums, leaving unavailable values empty; `escapeCsvField` quotes fields with commas, quotes or line breaks. `metricsFileName` builds `<cluster>-metrics-<UTC time>.<ext>` with unsafe characters replaced. `saveFile` saves through a `Blob` and a temporary object URL. `MetricsDownload` offers both buttons for the last response, with no extra request.
  - Done when: `npx vitest run src/metrics src/components/MetricsDownload.test.tsx src/components/ClusterMetrics.test.tsx` passes; then `npm test` and `npm run build` pass.

## Review
