# P09 · F3-B1 — Topic list with partitions, RF, approximate count
- **Milestone:** M1
- **Covers:** F3-AC1
- **Discovery:** —
- **Status:** Building        <!-- Planned | Building | Review | Done -->

## Demo
1. `docker compose -f deploy/compose.dev.yaml exec kafka-dev /opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:9092 --create --topic orders --partitions 6`, and the same for `audit` with `--partitions 1`.
2. `seq 1 1000 | docker compose -f deploy/compose.dev.yaml exec -T kafka-dev /opt/kafka/bin/kafka-console-producer.sh --bootstrap-server localhost:9092 --topic orders`.
3. `curl -s localhost:8081/api/v1/topics` → `audit`, then `orders` with `"partitions":6,"replicationFactor":1,"approxMessages":1000`.
4. UI: Dev → **Topics** tab → `audit`, then `orders · 6 · 1 · ~1000`.

## Tasks
- [x] **T09.1 Gateway: topic action and route** — Covers: F3-AC1
  - Files: internal/topics/topic.go (new), internal/topics/list_topic_metadata.go (new), internal/topics/count_topic_messages.go (new), internal/topics/list_topics.go (new), internal/topics/list_topics_test.go (new), internal/topics/compare_topics_by_name.go (new), internal/topics/compare_topics_by_name_test.go (new), internal/httpapi/register_list_topics.go (new), internal/httpapi/register_list_topics_test.go (new)
  - Do: Data-only `Topic` and `TopicMetadata`. Ports: `ListTopicMetadata` and `CountTopicMessages` (`Execute(ctx, names) (map[string]int64, error)`). `ListTopics` depends on both ports and the timeout, merges metadata with counts, sorts by name with `CompareTopicsByName`; empty cluster → `[]` (not null); port errors pass through. `RegisterListTopics`: `GET /api/v1/topics` → array `[{name, partitions, replicationFactor, internal, approxMessages}]`; any error → `NewClusterUnreachable` (from T04.1) 503.
  - Done when: `go test ./...` passes — ListTopics merges and sorts, empty → `[]`, errors pass through, deadline applied; route returns the JSON shape and 503 `cluster_unreachable` on error.

- [x] **T09.2 Gateway: Kafka adapters and wiring** — Covers: F3-AC1
  - Files: internal/kafka/list_topic_metadata.go (new), internal/kafka/count_topic_messages.go (new), test/integration/list_topics_test.go (new), cmd/gateway/main.go
  - Do: Metadata adapter via kadm `ListTopicsWithInternal` — partitions = count, replication factor = max replicas across partitions, `Internal` = `IsInternal`; topic-level error → error. Count adapter via `ListStartOffsets` + `ListEndOffsets`, summing `max(end − start, 0)` per partition (approximate: compaction, transaction markers). `main.go` wires adapters → `ListTopics` → route.
  - Done when: `go vet -tags integration ./...` exits 0 and `go test ./...` passes (running `TestListTopics_CountsMessages` — 6-partition `orders`, 10 records → 6 / 1 / 10 — is T09.5).

- [x] **T09.3 UI: topic data access** — Covers: F3-AC1
  - Files: src/gateway/types.ts (adds `Topic`), src/gateway/listTopics.ts (new), src/gateway/listTopics.test.ts (new), src/hooks/useTopics.ts (new), src/hooks/useTopics.test.tsx (new)
  - Do: `listTopics(fetchJson, gatewayUrl)` → `GET {url}/api/v1/topics`. `useTopics(gateway, listTopics)`, key `["gateway", id, "topics"]`, `retry: false`.
  - Done when: `npm test -- listTopics useTopics` passes: URL, trailing slash, HttpError; useTopics calls the injected function.

- [x] **T09.4 UI: Topics tab and table** — Covers: F3-AC1
  - Files: src/components/ClusterTabs.tsx (new), src/components/ClusterTabs.test.tsx (new), src/components/TopicList.tsx (new), src/components/TopicList.test.tsx (new), src/components/TopicTable.tsx (new), src/components/TopicTable.test.tsx (new), src/topics/compareTopicsByName.ts (new), src/topics/compareTopicsByName.test.ts (new), src/pages/ClusterPage.tsx (from T06.2), src/pages/ClusterPage.test.tsx (from T06.2), src/App.tsx, src/App.test.tsx, src/main.tsx
  - Do: `ClusterPage` takes `view: "brokers" | "topics"`; still resolves the gateway (and not found, from P08), then renders `ClusterTabs` and either `ClusterDetails` or `TopicList`. `App` routes `/clusters/:gatewayId/topics`. `ClusterTabs` links Brokers / Topics with `aria-current` on the active one. `TopicList` shows "Loading topics…", then `TopicTable` sorted by name (`compareTopicsByName`); on error a "Topics unavailable" placeholder until P12. `TopicTable` columns Name, Partitions, Replication, Messages (`~N`). `listTopics` injected from `main.tsx`.
  - Done when: `npm test` passes `ClusterPage` › "lists topics sorted by name with partitions, RF and ~count (F3-AC1)" (at `/clusters/dev/topics`, MSW `orders` 6/3/1000 and `audit` → `audit` first, then `orders` with 6, 3, ~1000), `ClusterTabs` active-tab case, `TopicTable` formatting; build exits 0.

- [ ] **T09.5 Run the Docker checks** — Covers: F3-AC1
  - Files: none (verification only; fixes become new tasks)
  - Do: With the remote Docker setup from TECH-SPEC Testing, run the integration tests.
  - Done when: `CGO_ENABLED=0 go test -tags integration ./test/integration/...` passes `TestListTopics_CountsMessages` and still passes `TestDescribeCluster_ReturnsClusterIDAndOneBroker`.

## Review
