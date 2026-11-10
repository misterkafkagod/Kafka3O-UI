# Discovery: cluster-metrics-sources
- **Goal:** Confirm which cluster metrics Kafka 4.3.1 on EKS-D reports to the Gateway's own Kafka user, and settle how a Prometheus endpoint is authenticated in the secured stack.
- **Done when:** log-directory disk numbers, partition health inputs and end offsets are read live from Kafka A with the Gateway user, with timings; the Prometheus authentication design is chosen.
- **Phase:** M15 (P83–P87)
- **Status:** Done
- **Secrets used:** `$PROBE_PASSWORD` — Secret `kafka-a-security` key `sasl.password`, read on the EKS-D node only; `$PROBE_CA` — the same Secret's `tls.crt`, written to a temporary 0600 file on the node and removed.

## Log
### 1. Look for an existing metrics source — 2026-11-10
- **Tried:** whether EKS-D already has metrics-server, Prometheus or a JMX exporter.
- **Request:** `kubectl get apiservices v1beta1.metrics.k8s.io`; `kubectl top nodes`; `kubectl get pods -A | grep -iE "prometheus|metrics|grafana|exporter"`; container ports of the Kafka StatefulSets.
- **Result:** no Metrics API (NotFound), no Prometheus or exporter pods; brokers `apache/kafka:4.3.1` expose only 9092 (internal) and 9095 (port-forward listener advertised as `localhost:19092`).
- **Learned:** CPU and memory would need a new source; the user chose Kafka-reported metrics only (no metrics-server, StatefulSets unchanged).

### 2. Read metrics from Kafka A with the Gateway user — 2026-11-10
- **Tried:** a throwaway franz-go probe (`cluster-metrics-sources/probe/`, same franz-go/kadm/kmsg versions as the Gateway) run on the node through `kubectl port-forward pod/kafka-a-0 19092:9095`, TLS server name `kafka-a.kafka3o-test-clusters.svc.cluster.local`, SCRAM-SHA-512 as `kafka3otest-a`.
- **Request:** `kadm.DescribeAllLogDirs(ctx, nil)`; raw `DescribeLogDirsRequest`; `kadm.ListTopics`; `kadm.DescribeTopicConfigs(all)`; `kadm.ListEndOffsets(all)`.
- **Result:**
  ```
  DescribeAllLogDirs (52ms): broker=1 dir=/var/lib/kafka/data total=94521434112 usable=79722250240 sumPartitionSize=203606 partitions=36
  raw DescribeLogDirs response version=5
  Metadata (1ms): topics=5 partitions=33 underReplicated=0 offline=0
  min.insync.replicas=1 (source DYNAMIC_DEFAULT_BROKER_CONFIG) on every topic
  ListEndOffsets (2ms): 33 partitions, e.g. kafka3o-connect-configs/0=109
  ```
- **Learned:** the Gateway user may describe log directories; v5 responses carry `TotalBytes`/`UsableBytes` of the volume holding the log directory (on EKS-D this is the node's filesystem, so it is shared with other workloads); partition sizes are per replica. Log directories list 36 partitions against 33 from `ListTopics`, because `ListTopics` leaves out internal topics (`__consumer_offsets`); sizes must include them, health counts should too (`ListTopicsWithInternal`). All reads together take well under a second on this cluster.

### 3. Kafka B — 2026-11-10
- **Tried:** the same probe against Kafka B.
- **Result:** not run: direct reads of the Production cluster from a shell were denied by the session's permission check.
- **Learned:** Kafka B is checked through its Gateway after deployment instead.

### 4. Prometheus authentication in the secured stack — 2026-11-10
- **Tried:** read how secured Gateways accept requests (`cmd/gateway/main.go`, `internal/gatewayauth`): every Kafka route needs a Console delegation over mutual TLS, which a Prometheus scraper cannot produce. Legacy mode already has `httpapi.WithBearerAuth` (SHA-256 + constant-time compare).
- **Learned:** expose `/metrics` on a separate, optional listener with its own bearer token from the environment, serving only metrics; it never reaches the Kafka API routes or the Console delegation.

## Recipe
1. Per request, with the Gateway's existing Kafka client and a 5 s timeout: `DescribeAllLogDirs(nil)` → per broker and directory: total bytes, usable bytes, Kafka bytes (sum of partition replica sizes), error.
2. `ListTopicsWithInternal()` → per partition: leader (< 0 or error ⇒ offline), replicas vs ISR (fewer ⇒ under-replicated).
3. `DescribeTopicConfigs(all names)` → `min.insync.replicas` per topic; ISR count below it ⇒ under min ISR.
4. `ListEndOffsets(all names)` → per topic, the sum of partition end offsets (a counter); the UI computes messages/s from two samples, Prometheus with `rate()`.
5. Each step that fails yields an unavailable section with the reason, never zeros; the other sections are still returned.

## Facts
- Kafka 4.3.1 DescribeLogDirs v5: `TotalBytes`/`UsableBytes` present (-1 when the broker cannot tell); kadm exposes them on `DescribedLogDir`.
- Partition size in log dirs is the replica's size; a topic's disk use is the sum over its replicas.
- min.insync.replicas comes back with the broker default applied, so a topic without an override still reports a value.
- Timing on Kafka A: log dirs 52 ms, metadata 1 ms, end offsets 2 ms.

## Dead Ends
- CPU/memory from Kafka: not reported by the Kafka protocol.
- A JMX exporter: would change the Kafka StatefulSets (not allowed).
- Scraping `/metrics` through the secured Gateway's API listener: needs a Console delegation that a scraper cannot obtain.

## Open Questions
- Kafka B (Production) values: verified after deployment through its Gateway.
- Multi-broker clusters: per-broker log dirs are returned for every broker; only single-broker clusters were available.

## Spec Impact
- FUNC-SPEC F41 and F53: detailed behaviors and acceptance criteria (written with this discovery).
- TECH-SPEC `## M15 cluster metrics`: one Gateway read `GET /api/v1/metrics` (VIEWER), the optional metrics listener (`metrics.listen`, token `KAFKA3O_METRICS_TOKEN`, same TLS certificate), Prometheus text format written with the standard library (no client_golang).
- ROADMAP: F41 in three phases (disk, health and sizes, throughput) and F53 in two (download, Prometheus).
