# P105 · F63-B1 — Brokers and broker configuration
- **Milestone:** M19
- **Covers:** F63-AC1
- **Discovery:** —
- **Status:** Building

## Demo
1. `kafka3o brokers`: broker 1 on kafka-a and kafka-b with host, port and "controller".
2. `kafka3o broker-config kafka-a 1 --filter log.retention`: those settings with value, source and read-only; sensitive values show "(sensitive, hidden)".

## Tasks
- [ ] **T105.1 Read every cluster, and brokers** — Covers: F63-AC1
  - Files: Kafka3O-cli internal/clusters/read_across_clusters.go (new), internal/clusters/read_across_clusters_test.go (new), internal/clusters/cluster_failure.go (new), internal/clusters/broker.go (new), internal/clusters/list_brokers.go (new), internal/clusters/list_brokers_test.go (new)
  - Do: `ReadAcrossClusters` runs one read per chosen accessible cluster concurrently and returns the results in the Console's order plus a classified failure per cluster that could not answer (unknown cluster → `ErrUnknownCluster`, signed out → fails); `ListBrokers` uses it with `/api/v1/cluster` (id, host, port, controller).
  - Done when: `go test ./internal/clusters/ -run 'ReadAcrossClusters|ListBrokers'` passes covering the order, a failing cluster, an unknown cluster and a signed-out session.
- [ ] **T105.2 `kafka3o brokers` and `kafka3o broker-config`** — Covers: F63-AC1
  - Files: internal/clusters/read_broker_config.go (new), internal/clusters/read_broker_config_test.go (new), internal/cli/new_brokers_command.go (new), internal/cli/new_brokers_command_test.go (new), internal/cli/new_broker_config_command.go (new), internal/cli/new_broker_config_command_test.go (new), cmd/kafka3o/main.go
  - Do: `brokers [--cluster]` table `CLUSTER BROKER HOST PORT ROLE` (failures on stderr, exit 2) or JSON; `broker-config <cluster> <broker> [--filter]` table `NAME VALUE SOURCE READ-ONLY` from `/api/v1/brokers/{id}/config`, sensitive values hidden in both formats; a broker id that is not a number exits 1.
  - Done when: `go test ./internal/clusters/ ./internal/cli/ -run 'Broker'` passes covering both tables, JSON, a failing cluster, the filter, a hidden sensitive value and a bad broker id.

## Review
