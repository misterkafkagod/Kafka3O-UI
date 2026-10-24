# P11 · F3-B3 — Filter topics by name
- **Milestone:** M1
- **Covers:** F3-AC3
- **Discovery:** —
- **Status:** Done        <!-- Planned | Building | Review | Done -->

## Demo
1. Dev → Topics, type `ORD` → only `orders` remains.
2. Type `zzz` → **No topics match "zzz"**.

## Tasks
- [x] **T11.1 Name filter** — Covers: F3-AC3
  - Files: src/topics/filterTopics.ts (from T10.1), src/topics/filterTopics.test.ts (from T10.1), src/components/TopicList.tsx (from T09.4), src/components/TopicList.test.tsx (from T09.4)
  - Do: `filterTopics` adds `text`: case-insensitive substring match on the name, combined with `showInternal`. `TopicList` adds an input labelled "Filter topics"; when topics exist but none match → `No topics match "<text>"` ("No topics" stays reserved for F3-B4).
  - Done when: `npm test` passes `TopicList` › "filters by name ignoring case (F3-AC3)" (`ORD` → only `orders`), › "shows No topics match when nothing matches", plus `filterTopics` text cases; build exits 0.

## Review
- **Demo:** passed (user's standing approval, 2026-10-24) — run by Claude against the dev stack: Dev → Topics, `ORD` left only `orders · 6 · 1 · ~1000`; `zzz` showed No topics match "zzz"
- **Vulnerability scan:** not required — no dependency changes in this phase
