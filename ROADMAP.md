# Roadmap

## Vision
Kafka3O lets developers see what's actually inside their Kafka cluster: which topics exist, what messages are in them, and whether consumers are keeping up. They get this from a browser, without installing the CLI or holding broker credentials. A small, stateless gateway (Kafka3O-Gateway) sits in front of one cluster and serves a web UI (Kafka3O-UI) focused on fast, safe debugging.

## Out of Scope
- More than one cluster per gateway instance
- Schema Registry, Avro, or Protobuf decoding (messages are shown as text, JSON, or base64)
- Cluster administration: ACLs, quotas, partition reassignment, broker config changes
- Replaying or copying messages between topics
- User accounts, SSO, or roles beyond a simple API key
- Transforming, routing, or enriching messages

## Features
- **F1** User can see whether the gateway is up and the cluster is reachable, plus a list of brokers
- **F2** User can see all topics with their partition count and approximate message count
- **F3** User can open a topic and see its partitions (leader, replicas, in-sync replicas, start and end offsets) and its config
- **F4** User can read the latest messages of a topic, showing key, value, headers, and timestamp, with values shown as text, JSON, or base64
- **F5** User can start reading from a specific partition, offset, or timestamp
- **F6** User can search a topic for messages whose key or value contains some text, within a bounded scan
- **F7** User can copy a link that opens directly to a specific message
- **F8** User can see consumer groups, their members, and lag per partition
- **F9** User can see which consumer groups read a given topic and how far behind they are
- **F10** User can access the gateway with an API key, and the gateway rejects requests without one
- **F11** User can produce a test message (key, value, headers) to a topic

## Cycles
### 01 · Phase 1 — A developer can browse topics and read messages end to end (UI → gateway → Kafka)
- **Status:** Active
- **Features:** F1, F2, F3, F4
- **Folder:** cycles/01-phase-1/

### 02 · Phase 2 — Find the message you're looking for
- **Status:** Planned
- **Features:** F5, F6, F7
- **Folder:** cycles/02-phase-2/

### 03 · Phase 3 — See whether consumers are keeping up
- **Status:** Planned
- **Features:** F8, F9
- **Folder:** cycles/03-phase-3/

### 04 · Phase 4 — Safe write access for debugging
- **Status:** Planned
- **Features:** F10, F11
- **Folder:** cycles/04-phase-4/

## Backlog
- **F12** User can reset a consumer group's offsets to earliest, latest, or a timestamp
- **F13** User can create or delete a topic

## Learnings
- 2026-10-13 (planning): Restarted from zero with a narrower scope. The previous plan targeted a 41-command admin gateway; this roadmap focuses on read-mostly debugging for developers and skips the POC because the stack is already understood.
