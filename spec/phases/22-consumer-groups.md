# P22 · F10 — Consumer groups and partition lag
- **Milestone:** M4
- **Covers:** F10-AC1, F10-AC2, F10-AC3
- **Discovery:** —
- **Status:** Review

## Demo
1. Produce and consume records in a consumer group, then open the cluster's Consumer groups tab.
2. Verify the group state, members, committed offsets and per-partition lag; inspect a partition without a commit.

## Tasks
- [x] **T22.1 Model consumer group lag** — Covers: F10-AC1, F10-AC2
  - Files: `internal/groups/consumer_group.go` (new), `internal/groups/fetch_consumer_groups.go` (new), `internal/groups/list_consumer_groups.go` (new), `internal/groups/list_consumer_groups_test.go` (new), `internal/groups/calculate_consumer_partition_lag.go` (new), `internal/groups/calculate_consumer_partition_lag_test.go` (new), comparator files and tests (new)
  - Do: Define injectable snapshots and a timeout-bound action; calculate lag only for valid commits within available offsets, preserve explicit unavailable errors, and sort groups, topics, members and partitions.
  - Done when: `go test ./internal/groups/...` covers exact lag, missing and out-of-range commits, unavailable offsets, group errors, timeout and sorting; `go test ./...` passes.
- [x] **T22.2 Fetch group and offset snapshots** — Covers: F10-AC1, F10-AC2, F10-AC3
  - Files: `internal/kafka/fetch_consumer_groups.go` (new), supporting mapping helpers/tests (new), `test/integration/consumer_groups_test.go` (new)
  - Do: Read classic and next-generation consumer descriptions, explicit subscriptions, assignments and committed offsets; retrieve log bounds, preserve per-group/partition errors, and propagate request failures.
  - Done when: Kafka adapter tests cover both group protocols and error cases; `go test ./...` passes and the real-broker test compiles or runs with Docker.
- [x] **T22.3 Expose the group API** — Covers: F10-AC1, F10-AC2, F10-AC3
  - Files: `internal/httpapi/register_list_consumer_groups.go` (new), `internal/httpapi/register_list_consumer_groups_test.go` (new), `cmd/gateway/main.go`, group DTO/lag conversion and related tests (amended)
  - Do: Wire a group-list endpoint with decimal-string offsets and explicit failure responses; use nullable string DTO fields so the generated OpenAPI schema matches the JSON wire format.
  - Done when: HTTP tests cover response shape, empty list, group errors and unavailable Kafka; `go test ./...` passes.
- [x] **T22.4 Add the group client and hook** — Covers: F10-AC1, F10-AC3
  - Files: `src/gateway/listConsumerGroups.ts` (new), client tests (new), `src/gateway/types.ts`, `src/hooks/useConsumerGroups.ts` (new), hook tests (new)
  - Do: Fetch and cache groups by gateway without automatic retries.
  - Done when: focused UI client/hook tests and `npm test` pass; `npm run build` succeeds.
- [x] **T22.5 Show consumer groups** — Covers: F10-AC1, F10-AC2, F10-AC3
  - Files: `src/components/ConsumerGroups.tsx` (new), related row and component tests, `src/components/ClusterTabs.tsx`, `src/pages/ClusterPage.tsx`, `src/App.tsx`, `src/main.tsx`
  - Do: Add the cluster tab and render group state, members, lag rows, unknown/error states and Retry.
  - Done when: focused UI tests cover populated, empty, missing/out-of-range/unavailable and failure/retry cases; `npm test` and `npm run build` pass.

## Review
