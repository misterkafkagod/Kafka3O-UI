# Discovery: s3-backup-connectors
- **Goal:** Back up a topic's records losslessly to S3-compatible storage on EKS-D with Aiven's S3 sink, and restore them into the same topic with Aiven's S3 source.
- **Done when:** a backup and a restore of `kafka3o-m10-verify` keep key, value, headers and timestamp, the restore reads a fixed snapshot, and the topic's backup does not re-save restored records.
- **Phase:** P75 (and P78)
- **Status:** Done
- **Secrets used:** S3 identity generated on the node into Secret `seaweedfs-s3-config` (storage) and `kafka-connect-backup-s3` (worker env `BACKUP_S3_ACCESS_KEY`, `BACKUP_S3_SECRET_KEY`); connector configs reference them as `${env:...}`. Never printed.

## Log
### 1. Storage image — 2026-11-10
- **Tried:** find a current MinIO image for the agreed S3-compatible test storage.
- **Request:** anonymous registry token + `GET /v2/minio/minio/tags/list` on Docker Hub; Quay `minio/minio` tags.
- **Result:** both 401 "authentication required".
- **Learned:** failed: MinIO no longer publishes free container images. SeaweedFS (Apache 2.0, `chrislusf/seaweedfs`, 4.51 released 2026-10-25) provides an S3 API and is used instead; the connectors only see S3.

### 2. Deploy SeaweedFS — 2026-11-10
- **Command:** [storage.yaml](./s3-backup-connectors/storage.yaml) in namespace `kafka3o-backup-storage` (local PV `/var/lib/kafka3o-backup-storage`, uid 1000), S3 identity generated with `openssl rand` on the node; `weed shell` `s3.bucket.create -name kafka3o-backups`.
- **Result:** "Start Seaweed S3 API Server 30GB 4.51 ffa87c25f at http port 8333"; bucket created.
- **Learned:** in-cluster endpoint `http://seaweedfs-s3.kafka3o-backup-storage.svc.cluster.local:8333`, region `us-east-1`.

### 3. Install the Aiven connectors — 2026-11-10
- **Command:** download `s3-sink-connector-for-apache-kafka-3.4.3.tar` and `s3-source-connector-for-apache-kafka-3.4.3.tar` from the v3.4.3 GitHub release (2026-09-08, Apache 2.0) on the node, check the release SHA-256 digests (`85661c4d…7329`, `1e837bd5…af03`: OK), unpack to `/var/lib/kafka3o-connect-plugins`, mount read-only into the worker at `/opt/connect-plugins`.
- **Result:** `GET /connector-plugins` lists `io.aiven.kafka.connect.s3.AivenKafkaConnectS3SinkConnector 3.4.3` and `io.aiven.kafka.connect.s3.source.S3SourceConnector 3.4.3`.
- **Learned:** the source tarball is 271 MB (it bundles Avro/Parquet/Hadoop); the worker needed 768 MB heap.

### 4. Lossless backup with the sink — 2026-11-10
- **Tried:** back up three records with keys and headers plus two older records.
- **Request:** sink with ByteArrayConverter for key, value and headers; `format.output.type=jsonl`, `format.output.fields=key,value,timestamp,headers`, `format.output.fields.value.encoding=base64`, `aws.s3.prefix=probe/kafka-a/kafka3o-m10-verify/`, `file.name.template={{topic}}-{{partition}}-{{start_offset}}`, `consumer.override.auto.offset.reset=earliest`.
- **Result:** after the 60 s offset flush, object `probe/kafka-a/kafka3o-m10-verify/kafka3o-m10-verify-0-00000000000000000000.gz` (gzip by default) with lines like `{"headers":[{"key":"source","value":"bTEz"},{"key":"trace","value":"MQ=="}],"value":"YmFja3VwIHRlc3Qgb25l","key":"ay0x","timestamp":"2026-11-10T07:33:15.940Z"}` (key, header values and value base64; null keys as `null`).
- **Learned:** the sink stores records losslessly (except offsets) in a simple, documented line format.

### 5. Restore with the source — 2026-11-10
- **Tried:** with the backup paused, restore the object into `kafka3o-m10-verify` with `input.format=jsonl`, `file.name.template=.*`, `file.compression.type=gzip`.
- **Result:** 5 records appended, each with the object name as key, the whole JSON line as value, no headers and the restore time as timestamp.
- **Learned:** failed: Aiven's source does not unwrap its own sink's envelope; it is not a lossless restore. The README says the connector "always produces a key" (the object key).

### 6. What the source hands to a transform — 2026-11-10
- **Tried:** with the user's choice of option B (a custom transform keeps restores inside Kafka Connect), a probe transform that logs types and drops every record (nothing written).
- **Result:** `java.util.HashMap`, no schema, keys `headers, value, key, timestamp`; `value` and `key` are base64 strings, `headers` a list of `{key, value}` maps, `timestamp` an ISO-8601 string; the record key is the object key as bytes.
- **Learned:** an unwrap transform needs no JSON parsing; the toolchain is Temurin JDK 21.0.13 and Maven 3.9.16 (matching the worker's Java 21), with `connect-api` 4.3.1 as a provided dependency.

### 7. Lossless restore with the unwrap transform — 2026-11-10
- **Tried:** [prototype](./s3-backup-connectors/unwrap-transform/) `dev.kafka3o.connect.UnwrapBackupRecord` on the S3 source with ByteArrayConverter for key, value and headers, `file.name.template={{topic}}-{{partition}}-{{start_offset}}.gz`, marker header `kafka3o-restore` = restore ID.
- **Result:** the first attempt failed with "Invalid schema type for ByteArrayConverter: STRING" (the marker header was a string; nothing was written). After adding it as bytes, 10 records were appended with their original keys, values, headers and creation times (for example `CreateTime:1794295995940 … source:m13,trace:1,kafka3o-restore:r-e2e-2  k-1  backup test one`).
- **Learned:** the restore is lossless apart from new offsets and the added marker header; the partition comes from the object name.

### 8. Loop protection and restore boundaries — 2026-11-10
- **Tried:** a backup with `transforms=skipRestored` (`Filter` with predicate `HasHeaderKey name=kafka3o-restore`), paused during the restore; then one new record, and the backup resumed.
- **Result:** the resumed backup wrote only the new record (object `…-00000000000000000020.gz`, 1 record, no marker). But the still-running restore then picked up that new object and appended it again (topic end offset 22).
- **Learned:** the marker filter stops restored records from being backed up; the restore itself must be bounded to the objects that existed when it started and removed before the backup resumes.

### 9. Restore progress — 2026-11-10
- **Request:** `GET /connectors/{restore}/offsets`; the worker's `kafka3o-connect-offsets` topic.
- **Result:** the REST endpoint listed only some processed objects, each with `"offset": null`; the offsets topic held `{"recordCount":10}` and `{"recordCount":1}` per object key, with no tombstones.
- **Learned:** completion can be measured exactly: a restore is done when, for every object in its snapshot, the committed `recordCount` equals the object's record count. The REST view is not reliable for this.

## Recipe
1. Backup (per topic): Aiven S3 sink with ByteArrayConverter for key, value and headers; `format.output.type=jsonl`, `format.output.fields=key,value,timestamp,headers`, `format.output.fields.value.encoding=base64`, gzip (default), `aws.s3.prefix=<cluster>/<topic>/`, `file.name.template={{topic}}-{{partition}}-{{start_offset}}`, `consumer.override.auto.offset.reset=earliest`, credentials as `${env:BACKUP_S3_ACCESS_KEY}`/`${env:BACKUP_S3_SECRET_KEY}`, and `transforms=skipRestored` (`Filter` + `HasHeaderKey` `kafka3o-restore`).
2. Restore: pause the topic's backup; list the topic's objects (the snapshot) and their record counts; create an S3 source with `topic=<topic>`, the same prefix, `file.name.template={{topic}}-{{partition}}-{{start_offset}}.gz`, `file.compression.type=gzip`, `input.format=jsonl`, ByteArrayConverter for key, value and headers, and the Kafka3O unwrap transform configured with the restore ID and the snapshot boundary (per partition, the highest `start_offset` in the snapshot), so records from newer objects are dropped.
3. Completion: when every snapshot object's committed `recordCount` (Connect offsets topic) equals its record count, delete the restore connector and resume the backup.

## Facts
- Storage: SeaweedFS 4.51 S3 API at `http://seaweedfs-s3.kafka3o-backup-storage.svc.cluster.local:8333`, bucket `kafka3o-backups`, region `us-east-1`; objects `<prefix><topic>-<partition>-<20-digit start offset>.gz`, one gzip jsonl file per partition per flush (60 s).
- Line format: `{"key": <base64|null>, "value": <base64|null>, "timestamp": "<ISO-8601 UTC>", "headers": [{"key": "...", "value": <base64|null>}]}`.
- Plugins: Aiven S3 sink and source 3.4.3 (Apache 2.0, SHA-256 checked), 66 MB and 271 MB; worker heap 768 MB.
- Restored records keep key, value, headers and timestamp, get new offsets in the original partition, and carry one extra header `kafka3o-restore: <restore id>`.

## Dead Ends
- MinIO container images (no longer published).
- Restoring with the Aiven source alone: values become the JSON line, the key the object name, headers are dropped and timestamps reset.
- A string marker header with ByteArrayConverter for headers.
- Leaving a restore running after the backup resumes: it restores the backup's new objects again.
- Connect's REST `/offsets` for restore progress.

## Open Questions
- Throughput of large restores (many GB) was not measured; Kafka Connect can be scaled out with more workers and tasks.
- The Gateway needs read-only S3 access to list objects and count records, and read access to the Connect offsets topic; both are new for the Gateway.

## Spec Impact
- FUNC-SPEC F50-AC1: restored records carry one extra header, `kafka3o-restore`, naming the restore; this is how the topic's backup skips them (F50-AC2).
- TECH-SPEC: add the Java transform module (Temurin 21, Maven 3.9.16, connect-api 4.3.1 provided, JUnit 6.1.3) and the Gateway's read-only S3 listing (Go standard library, SigV4) and Connect offsets reading; record SeaweedFS instead of MinIO.
- Phases: P78 (restore) is larger than planned and is split: P78 transform plugin and restore start; P79 restore completion and finishing.

