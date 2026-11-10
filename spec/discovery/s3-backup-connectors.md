# Discovery: s3-backup-connectors
- **Goal:** Back up a topic's records losslessly to S3-compatible storage on EKS-D with Aiven's S3 sink, and restore them into the same topic with Aiven's S3 source.
- **Done when:** a backup and a restore of `kafka3o-m10-verify` keep key, value, headers and timestamp, the restore reads a fixed snapshot, and the topic's backup does not re-save restored records.
- **Phase:** P75 (and P78)
- **Status:** Exploring (blocked on a restore design decision)
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
