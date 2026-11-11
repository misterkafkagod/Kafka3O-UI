# Discovery: backup-settings-and-restore-filters
- **Goal:** Find which backup settings the Aiven S3 sink can take per connector, whether the source restores every compression losslessly, and how time and partition filters affect the restore's progress and automatic finish.
- **Done when:** each offered setting is shown working on the test Connect worker, and a filtered restore's committed offsets are understood well enough to keep the exact finish check.
- **Phase:** P89 (and P91, P92)
- **Status:** Done
- **Secrets used:** the worker's existing `kafka-connect-backup-s3` (`${env:BACKUP_S3_ACCESS_KEY}`, `${env:BACKUP_S3_SECRET_KEY}`) and Kafka A user (`CONNECT_SASL_PASSWORD`, written only inside the pod to `/tmp/client.props`). Never printed.

## Log
### 1. Sink and source settings — 2026-11-11
- **Tried:** list the sink's and source's settings through Connect's config validation.
- **Request:** `PUT /connector-plugins/io.aiven.kafka.connect.s3.AivenKafkaConnectS3SinkConnector/config/validate` (and the source's) with `file.compression.type=bogus`, `offset.flush.interval.ms=5000`.
- **Result:** `file.compression.type` must be one of `none`, `gzip`, `snappy`, `zstd` (both sink and source); the sink has `file.max.records` and `file.max.bytes` (0 = unlimited); `offset.flush.interval.ms` is not a connector setting (it is the worker's, unset = 60 s).
- **Learned:** compression and records per file are per connector; the flush time is not.

### 2. zstd, from now on, 2 records per file — 2026-11-11
- **Tried:** probe sink `kafka3o-probe-m16-zstd` (prefix `probe-m16/zstd/…`, `file.compression.type=zstd`, `consumer.override.auto.offset.reset=latest`, `file.max.records=2`), then produced 5 and later 5 more records to `kafka3o-m10-verify` from the Connect pod.
- **Result:** objects `kafka3o-m10-verify-<p>-<offset>.zst` appeared within 1–4 s of producing, both batches (101 s apart, so not the 60 s commit); partition 0's first object starts at offset 33, skipping the 33 older records; a partition with 3 records got files at offsets 33 and 35. The M13 backup (no `file.max.records`) wrote the same partition-1 record 28 s later, at its 60 s commit.
- **Learned:** `latest` backs up only new messages; `file.max.records` caps records per object. (Corrected 2026-11-11 by the M16 live check: objects are written at the worker's 60 s commit either way; these writes only happened to follow commits.)

### 3. snappy and none — 2026-11-11
- **Tried:** probe sinks with `snappy` and `none`, 2 records produced.
- **Result:** objects `…-0-00000000000000000037.snappy` and `…-0-00000000000000000037` (no extension); the snappy file starts `82 53 4e 41 50 50 59 00` (xerial snappy stream: magic, version 1, compatible 1, then chunks of a 4-byte big-endian length and a snappy block); zstd files start `28 b5 2f fd`.
- **Learned:** the extension follows the compression (`.gz`, `.zst`, `.snappy`, none). The Gateway's name parser (only `.gz`) and the transform's (`.gz` or none) must accept all four; Go can read them with `klauspost/compress` (`zstd`, `snappy` block decode), already in go.sum through franz-go.

### 4. Dropped records and committed offsets — 2026-11-11
- **Tried:** restore sources through the current transform: (a) zstd objects, all dropped by the transform; (b) uncompressed objects with snapshot boundary `0:37` (partition 2's object dropped); then read `kafka3o-connect-offsets`.
- **Result:** (a) no offsets at all, nothing appended; (b) partition 0's object `{"recordCount":1}` and one record appended; partition 2's object has no entry. The REST `/offsets` view again showed only `"offset": null`.
- **Learned:** records a transform drops commit no offset. A partition filter therefore works with the existing mechanism: leave other partitions out of the snapshot boundary and out of the expected counts.

### 5. Dropping inside an object — 2026-11-11
- **Tried:** a 6-line uncompressed object (lines 2 and 6 tombstones) restored with the unwrap transform followed by Kafka's `Filter` with `RecordIsTombstone`.
- **Result:** 5 records appended (1 from another object, 4 from this one); the object's committed `{"recordCount":5}`.
- **Learned:** `recordCount` is the line number of the last record written, not how many were written. For a time filter the Gateway expects, per object, the line number of its last matching line, and leaves objects without matching lines out of the finish check.

### 6. Restoring zstd and snappy — 2026-11-11
- **Tried:** sources over the zstd and snappy probe prefixes without unwrap (values as JSON text, marked with `InsertHeader kafka3o-restore` so backups skip them). The first two attempts failed on my converters (`Invalid schema type for ByteArrayConverter: STRING` for the string key, then the string header).
- **Result:** with `StringConverter` key and header converters, 26 records appended (18 from zstd, 8 from snappy), e.g. `{"headers":[],"value":"bTE2IHNpeA==","key":"bTE2LWs2","timestamp":"2026-11-11T01:49:39.468Z"}`.
- **Learned:** the source reads all compressions and hands the transform the same line map as with gzip. Probe connectors were deleted; probe objects stay under `probe-m16/`; the 26 marked raw copies and 6 restored probe records remain on the synthetic topic.

## Recipe
1. Backup settings → sink configuration (defaults give the M13 configuration):
   - start point `earliest` | `latest` → `consumer.override.auto.offset.reset`
   - compression `gzip` | `zstd` | `snappy` | `none` → `file.compression.type`
   - records per file 0 (unlimited) or 1–1,000,000 → `file.max.records`; objects are written at the worker's 60 s commit either way
   - the sink's consumer group is `connect-<connector name>`, so a backup started again for a topic resumes from the deleted job's committed offsets and the start point applies only to a topic never backed up before
2. Effective settings are read back from `GET /connectors/<backup>/config` (only these three keys).
3. Restore: `file.compression.type` and the template's extension follow the backup's compression; the snapshot is the objects with that extension.
4. Partitions: the snapshot boundary and the expected objects list only the chosen partitions.
5. Time range: the transform drops records whose timestamp is outside `[from, to)`; for each object the Gateway expects the line number of its last line in range and leaves out objects with none; the restored count is the number of lines in range.
6. Finish: unchanged rule: every expected object's committed `recordCount` reaches its expected value.

## Facts
- Extensions: gzip `.gz`, zstd `.zst`, snappy `.snappy` (xerial stream), none: no extension.
- Worker offset commit interval: 60 s (worker default; not settable per connector).
- Records dropped by a transform commit no source offset; `recordCount` is the 1-based line number of the last written line of the object.

## Dead Ends
- A per-connector flush time: `offset.flush.interval.ms` is a worker setting. Changing the worker's value would affect every connector and is not offered.
- Reading progress from the REST `/offsets` endpoint (shows `"offset": null`).

## Open Questions
- Behaviour with `file.max.records` under heavy load (many small objects) is not measured.
- Objects of an earlier backup with a different compression are not restored by a later restore (the source reads one compression); the Backup tab says so.

## Spec Impact
- FUNC-SPEC F54-B2/AC2: drop the flush interval (not per connector, told to the user in the proposal); records per file also decides how soon objects are written.
- FUNC-SPEC F55-AC3: restores read objects written with the backup's current compression.
- TECH-SPEC M16: setting keys and bounds, read-back of effective settings, object name extensions, `klauspost/compress` becomes a direct dependency (no new module), transform gains `time.from`/`time.to` and accepts all extensions, finish rule for filters.
- ROADMAP: phases unchanged.
