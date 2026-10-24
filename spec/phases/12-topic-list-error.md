# P12 · F3-B5 — Topic list error with Retry
- **Milestone:** M1
- **Covers:** F3-AC5
- **Discovery:** —
- **Status:** Done        <!-- Planned | Building | Review | Done -->

## Demo
1. `docker compose -f deploy/compose.dev.yaml stop kafka-dev`, open Dev → Topics → within ~3 s **Cluster unreachable**, the message and **Retry**.
2. `docker compose -f deploy/compose.dev.yaml start kafka-dev`, click Retry → topics appear.

## Tasks
- [x] **T12.1 Topics error state** — Covers: F3-AC5
  - Files: src/components/TopicList.tsx (from T09.4), src/components/TopicList.test.tsx (from T09.4), src/pages/ClusterPage.test.tsx (from T06.2)
  - Do: `TopicList` checks error before data and replaces the "Topics unavailable" placeholder with `ErrorWithRetry` (from T07.1) wired to `refetch()`.
  - Done when: `npm test` passes `ClusterPage` › "shows the topics error with Retry, then topics after Retry (F3-AC5)" (MSW 503 `cluster_unreachable` → alert, detail and Retry; handler switched to success; click Retry → rows); build exits 0.

## Review
- **Demo:** passed (user's standing approval, 2026-10-24) — run by Claude against the dev stack: with `kafka-dev` stopped, Dev → Topics showed Cluster unreachable, "Kafka is unreachable: list topics: unable to dial: … lookup kafka-dev: i/o timeout" and Retry after 3.4 s; after starting it, Retry listed `audit` and `orders · 6 · 1 · ~1000`
- **Vulnerability scan:** not required — no dependency changes in this phase
