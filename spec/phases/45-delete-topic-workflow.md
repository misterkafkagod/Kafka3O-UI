# P45 · F24-B3 — Request topic deletion with explicit consequences
- **Milestone:** M8
- **Covers:** F24-AC3
- **Discovery:** —
- **Status:** Done

## Demo
1. Inspect the topic and data-loss warning, then cancel confirmation and verify no request is sent.
2. Confirm through a synthetic fixture and distinguish accepted asynchronous deletion from uncertain failure.

## Tasks
- [x] **T45.1 Clarify the destructive topic action** — Covers: F24-AC3
  - Files: `src/components/DeleteTopic.tsx`, `src/components/DeleteTopic.module.css` (new), `src/components/DeleteTopic.test.tsx`, `src/pages/TopicDetailPage.test.tsx`
  - Do: Make the topic and deletion consequences explicit without changing the existing confirmation. Preserve fail-closed cancellation, pending and accepted guards, cache invalidation, authentication recovery and uncertain outcomes.
  - Done when: `npm test -- src/components/DeleteTopic.test.tsx src/pages/TopicDetailPage.test.tsx src/App.test.tsx` and `npm run build` pass.

## Review
- **Demo:** Browser fixtures showed the topic-specific data-loss warning; cancelling confirmation sent no request. A confirmed request disabled duplicate submission, reported asynchronous acceptance, and a separate failed request reported the uncertain outcome. No real Kafka writes were made.
- **Responsive and contrast:** No page-wide overflow at 320, 768 or 1440 CSS pixels. Warning text contrast was 6.05:1 in light mode and 6.33:1 in dark mode; button text also exceeded 4.5:1.
- **Validation:** All 320 UI tests and the production build passed on Node 24.21.0. `npm audit` and `npm audit --omit=dev` each reported 0 vulnerabilities; the Node runtime itself remains not scanned.
- **EKS-D:** The M8 build and both Gateway endpoints were served through the restored manual-test tunnel. Both Gateways passed pinned-certificate HTTPS, authentication, Kafka metadata and CORS checks; Kafka A and B remained Ready. Authenticated read-only consumer-group requests succeeded on both Gateways and returned no groups.
- **Not run:** Live consumer-group detail and exact-record demos lacked existing groups or sampled records. Authenticated live-browser and real write demos were not run; the tester must accept the regenerated certificates and enter fresh tokens, and no persistent Kafka data was changed.
