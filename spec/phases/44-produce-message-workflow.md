# P44 · F24-B2 — Produce messages with contextual feedback
- **Milestone:** M8
- **Covers:** F24-AC2
- **Discovery:** —
- **Status:** Done

## Demo
1. Open the producer and inspect its topic/gateway destination, value, optional key and header controls.
2. Submit through a synthetic fixture and verify exact-position success, pending protection and an uncertain-delivery warning.

## Tasks
- [x] **T44.1 Organize the producer form** — Covers: F24-AC2
  - Files: `src/components/ProduceTopicMessage.tsx`, `src/components/ProduceTopicMessage.module.css` (new), `src/components/ProduceTopicMessage.test.tsx`, `src/pages/TopicPage.test.tsx`
  - Do: Identify the destination and group the existing payload and header controls responsively. Preserve empty values and keys, pending guards, exact result links, authentication recovery, cache invalidation and no automatic retry.
  - Done when: `npm test -- src/components/ProduceTopicMessage.test.tsx src/pages/TopicPage.test.tsx src/App.test.tsx` and `npm run build` pass.

## Review
- **Demo:** Browser fixtures submitted a synthetic value, empty key and header, verified pending protection and an exact large-offset link, and showed the uncertain-delivery warning without an automatic retry. No real Kafka writes were made.
- **Responsive:** The producer had no page-wide overflow at 320, 768 or 1440 CSS pixels; the optional-key checkbox remained adjacent to its label.
- **Validation:** All 320 UI tests and the production build passed on Node 24.21.0. The M8 deployment remains deferred until the milestone's final phase.
- **Vulnerability scan:** Not run; P44 adds no dependencies and is not the final M8 phase.
