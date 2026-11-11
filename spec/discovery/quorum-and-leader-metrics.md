# Discovery: quorum-and-leader-metrics
- **Goal:** Confirm the Gateway's Kafka user can read the KRaft controller quorum and partition leaders on Kafka 4.3.1, and how franz-go sends DescribeQuorum.
- **Done when:** DescribeQuorum and leader/replica/preferred-leader counts are read live from Kafka A with the Gateway user.
- **Phase:** P94 (and P95)
- **Status:** Done
- **Secrets used:** Secret `kafka-a-security` (`sasl.password`, `tls.crt`), read on the EKS-D node only into a temporary 0600 directory, as in the cluster-metrics-sources discovery. Never printed.

## Log
### 1. Quorum through the Kafka CLI — 2026-11-11
- **Tried:** `kafka-metadata-quorum.sh describe --status` and `--replication` inside the test Connect pod as `kafka3otest-a` (the Gateway's user on Kafka A).
- **Result:** LeaderId 1, LeaderEpoch 3, HighWatermark 894477, MaxFollowerLag 0, CurrentVoters `[{"id": 1}]`, CurrentObservers `[]`; replication: node 1 Leader, Lag 0. Both StatefulSets run 1 replica (combined broker+controller).
- **Learned:** the user may describe the quorum; on EKS-D the quorum is one combined node, so there are no followers or observers to show lag.

### 2. Quorum and leaders through franz-go — 2026-11-11
- **Tried:** throwaway probe ([quorum-and-leader-metrics/probe](./quorum-and-leader-metrics/probe/main.go), Gateway's franz-go/kmsg versions) through `kubectl port-forward pod/kafka-a-0 19092:9095`: `kmsg.DescribeQuorumRequest` for `__cluster_metadata` partition 0 via `RequestWith(ctx, client)`, then `kadm.ListTopicsWithInternal`.
- **Result:** DescribeQuorum v2 in 45 ms, error 0, leader 1, epoch 3, high watermark 894587, voter 1 LEO 894587; Nodes [1]. Leaders `{1: 39}`, replicas `{1: 39}`, non-preferred leaders none.
- **Learned:** franz-go routes DescribeQuorum to a broker, which answers it in KRaft; no kadm helper exists, so the Gateway sends the kmsg request.

## Recipe
1. Quorum: `kmsg.DescribeQuorumRequest{Topics: [{Topic: "__cluster_metadata", Partitions: [{Partition: 0}]}]}` → check top-level and partition `ErrorCode` (and `ErrorMessage`); report leader, epoch, high watermark and, per voter and observer, `lag = leader LEO − replica LEO` (the leader's LEO is its own voter entry) and the last-fetch and caught-up timestamps (−1 = unknown).
2. Leaders: from the same metadata as partition health (`ListTopicsWithInternal`), per broker: partitions it leads, replicas it holds, and leaders that are not `Replicas[0]` (the preferred replica). Offline partitions (leader −1) are not counted as led.

## Facts
- EKS-D Kafka A: one combined node (id 1) is leader and only voter; lag 0.
- DescribeQuorum needs DESCRIBE on CLUSTER; `kafka3otest-a` has it on Kafka A. Kafka B (Production) is first checked through its Gateway after deployment.

## Dead Ends
- None.

## Open Questions
- Kafka B's quorum permissions (checked after deployment).

## Spec Impact
- TECH-SPEC M17: DescribeQuorum through `kmsg`, lag from LEO differences; leaders from the existing metadata read.
- ROADMAP: phases unchanged.
