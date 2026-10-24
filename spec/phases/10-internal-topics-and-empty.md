# P10 · F3-B2 + F3-B4 — Internal topics hidden; "No topics"
- **Milestone:** M1
- **Covers:** F3-AC2, F3-AC4
- **Discovery:** —
- **Status:** Review        <!-- Planned | Building | Review | Done -->

## Demo
1. Prod → Topics on the fresh prod cluster → **No topics**.
2. `docker compose -f deploy/compose.dev.yaml exec kafka-prod /opt/kafka/bin/kafka-consumer-groups.sh --bootstrap-server localhost:9092 --describe --group demo` (the coordinator lookup creates `__consumer_offsets`).
3. Reload → still "No topics"; toggle **Show internal** → `__consumer_offsets` listed.

## Tasks
- [x] **T10.1 Internal toggle and empty state** — Covers: F3-AC2, F3-AC4
  - Files: src/topics/filterTopics.ts (new), src/topics/filterTopics.test.ts (new), src/components/TopicList.tsx (from T09.4), src/components/TopicList.test.tsx (from T09.4)
  - Do: Pure `filterTopics(topics, {showInternal})` drops internal topics unless `showInternal`. `TopicList` adds a **Show internal** checkbox (off by default); an empty visible list shows **No topics**.
  - Done when: `npm test` passes `TopicList` › "hides internal topics until Show internal is on (F3-AC2)", › "shows No topics when only internal topics exist (F3-AC4)", plus `filterTopics` cases; build exits 0.

## Review
