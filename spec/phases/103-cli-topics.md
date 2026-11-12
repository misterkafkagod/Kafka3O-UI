# P103 · F62-B1 — Topics across all clusters
- **Milestone:** M18
- **Covers:** F62-AC1
- **Discovery:** —
- **Status:** Building

## Demo
1. `kafka3o topics`: every non-internal topic of Kafka A and Kafka B with cluster, partitions, replication factor and approximate messages.
2. `kafka3o topics --filter VERIFY` shows `kafka3o-m10-verify` on kafka-a; `--internal` adds `__consumer_offsets`; `--cluster kafka-b` shows only Kafka B; `--cluster nope` exits 1 with "cluster nope not found or not accessible".

## Tasks
- [ ] **T103.1 Topics from every cluster** — Covers: F62-AC1
  - Files: Kafka3O-cli internal/topics/topic.go (new), internal/topics/list_cluster_topics.go (new), internal/topics/list_cluster_topics_test.go (new), internal/topics/list_topics_across_clusters.go (new), internal/topics/list_topics_across_clusters_test.go (new), internal/topics/filter_topics.go (new), internal/topics/filter_topics_test.go (new), internal/topics/compare_cluster_topics.go (new), internal/topics/compare_cluster_topics_test.go (new)
  - Do: `ListClusterTopics` reads one cluster's `/api/v1/topics` through the Console; `ListTopicsAcrossClusters` reads the chosen cluster or every accessible one concurrently, returns the topics (cluster order, then name) and a failure per cluster that could not answer (classified like the cluster list), fails only for a signed-out session or an unknown cluster; `FilterTopics` keeps names containing the text (case-insensitive) and hides internal topics unless asked.
  - Done when: `go test ./internal/topics/` passes covering two clusters, one failing, the order, an unknown cluster, the filter and the internal flag.
- [ ] **T103.2 `kafka3o topics`** — Covers: F62-AC1
  - Files: internal/cli/new_topics_command.go (new), internal/cli/new_topics_command_test.go (new), cmd/kafka3o/main.go
  - Do: `topics [--cluster id] [--filter text] [--internal]`; table `CLUSTER TOPIC PARTITIONS REPLICATION MESSAGES`, or JSON `{"topics": [...], "failures": [...]}`; each failing cluster is reported on stderr in the table format and the command exits 2; "No topics." when nothing matches.
  - Done when: `go test ./internal/cli/ -run Topics` passes covering the table, the JSON, a failing cluster (exit 2), the filter, `--cluster` and an unknown cluster (exit 1).

## Review
