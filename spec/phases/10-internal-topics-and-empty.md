# P10 · F3-B2 + F3-B4 — Internal topics hidden; "No topics"
- **Milestone:** M1
- **Covers:** F3-AC2, F3-AC4
- **Discovery:** —
- **Status:** Done        <!-- Planned | Building | Review | Done -->

## Demo
1. Prod → Topics on the fresh prod cluster → **No topics**.
2. `docker compose -f deploy/compose.dev.yaml exec kafka-prod /opt/kafka/bin/kafka-console-consumer.sh --bootstrap-server localhost:9092 --include '.*' --group demo --timeout-ms 5000` (joining the group creates `__consumer_offsets`; the pattern subscription auto-creates no other topic). <!-- amended in review: `kafka-consumer-groups.sh --describe` on Kafka 4.3 fails with GroupIdNotFound and creates nothing -->
3. Reload → still "No topics"; toggle **Show internal** → `__consumer_offsets` listed.

## Tasks
- [x] **T10.1 Internal toggle and empty state** — Covers: F3-AC2, F3-AC4
  - Files: src/topics/filterTopics.ts (new), src/topics/filterTopics.test.ts (new), src/components/TopicList.tsx (from T09.4), src/components/TopicList.test.tsx (from T09.4)
  - Do: Pure `filterTopics(topics, {showInternal})` drops internal topics unless `showInternal`. `TopicList` adds a **Show internal** checkbox (off by default); an empty visible list shows **No topics**.
  - Done when: `npm test` passes `TopicList` › "hides internal topics until Show internal is on (F3-AC2)", › "shows No topics when only internal topics exist (F3-AC4)", plus `filterTopics` cases; build exits 0.

## Review
- **Demo:** passed (user's standing approval, 2026-10-24) — run by Claude against the dev stack: Prod → Topics showed No topics; after step 2 the gateway listed `__consumer_offsets` (internal, 50 partitions) and the UI still showed No topics; Show internal listed `__consumer_offsets · 50 · 1 · ~3`
- **Vulnerability scan:** not required — no dependency changes in this phase
- **Notes:**
  - Demo step 2 corrected: on Kafka 4.3 `kafka-consumer-groups.sh --describe` for an unknown group fails with GroupIdNotFound and does not create `__consumer_offsets`; a pattern-subscribed console consumer in group `demo` does.
