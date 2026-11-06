# P43 · F24-B1 — Create topics with contextual feedback
- **Milestone:** M8
- **Covers:** F24-AC1
- **Discovery:** —
- **Status:** Done

## Demo
1. Open topic creation, inspect its gateway and settings, and submit invalid values without a request.
2. With a synthetic gateway fixture, inspect pending, accepted, conflict and uncertain outcomes without duplicate submissions.

## Tasks
- [x] **T43.1 Organize the create-topic form** — Covers: F24-AC1
  - Files: `src/components/CreateTopic.tsx`, `src/components/CreateTopic.module.css` (new), `src/components/CreateTopic.test.tsx`, `src/pages/ClusterPage.test.tsx`
  - Do: Identify the destination gateway and organize the existing settings and outcome feedback responsively. Preserve validation, pending guards, cache invalidation, authentication recovery and uncertain failure semantics.
  - Done when: `npm test -- src/components/CreateTopic.test.tsx src/pages/ClusterPage.test.tsx src/App.test.tsx` and `npm run build` pass.

## Review
- **Demo:** Browser fixtures verified invalid settings sent no request, pending submission was disabled, and accepted, conflict and uncertain outcomes remained distinct. No real Kafka writes were made.
- **Responsive:** The form had no page-wide overflow at 320, 768 or 1440 CSS pixels.
- **Validation:** All 320 UI tests and the production build passed on Node 24.21.0. The M8 deployment remains deferred until the milestone's final phase.
- **Vulnerability scan:** Not run; P43 adds no dependencies and is not the final M8 phase.
