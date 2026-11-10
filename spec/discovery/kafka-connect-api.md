# Discovery: kafka-connect-api
- **Goal:** Learn the Kafka Connect REST API shapes and lifecycle behavior the Gateway must use to list connectors and tasks with their state and errors, and to pause, resume and restart them.
- **Done when:** a test Connect worker on EKS-D runs running, paused and failed file connectors, and the list, status, pause, resume, connector restart, task restart and unreachable responses are recorded with fixtures.
- **Phase:** P73 (and P74)
- **Status:** Done
- **Secrets used:** `CONNECT_SASL_PASSWORD` in the worker pod, copied on the node from `kafka-a-security` key `sasl.password` (never printed); the Kafka A CA from the same secret's `tls.crt`.

## Log
### 1. Deploy one distributed worker on Kafka A — 2026-11-09
- **Tried:** run Connect from `apache/kafka:4.3.1` (already on the node) in namespace `kafka3o-connect-test`, as [worker.yaml](./kafka-connect-api/worker.yaml).
- **Command:** copy only `sasl.password` and `tls.crt` (as `ca.crt`) from `kafka-a-security` into Secret `kafka-connect-kafka-a` on the node; `kubectl apply -f worker.yaml`.
- **Result:** first rollout stuck in `CreateContainerConfigError`: "container has runAsNonRoot and image has non-numeric user (appuser)". With `runAsUser: 1000` the pod became ready; log shows "Kafka Connect started", "Joined group at generation 1", "Herder started".
- **Learned:** the image needs a numeric user under `runAsNonRoot`. `EnvVarConfigProvider` keeps the SCRAM password out of the ConfigMap. The file connectors need `plugin.path=/opt/kafka/libs/connect-file-4.3.1.jar`.

### 2. Root and plugins — 2026-11-09
- **Request:** `GET /`, `GET /connector-plugins`
- **Result:** 200 `{"version":"4.3.1","commit":"26b251a451ce941d","kafka_cluster_id":"lhGFvWSZTF66EQfx-IW6jg"}`; plugins: FileStreamSink, FileStreamSource and three MirrorMaker connectors.
- **Learned:** `GET /` is a cheap reachability check and reports the Kafka cluster ID the worker uses.

### 3. Create running, paused and failing connectors — 2026-11-09
- **Tried:** create three FileStreamSink connectors reading `kafka3o-m10-verify`; the failing one writes to `/nonexistent-dir/...`.
- **Request:** `POST /connectors` with `{"name":...,"config":{...}}` and `Content-Type: application/json` (the API server service proxy via `kubectl create --raw` returned 415 Unsupported Media Type, so calls go through a loopback port-forward and `curl`).
- **Result:** 201 with name, config, empty task list and type.
- **Learned:** creation echoes the full configuration; F35 never needs it.

### 4. List with status — 2026-11-09
- **Request:** `GET /connectors?expand=status`
- **Result:** 200, an object keyed by connector name; each `status` has `name`, `type`, `connector.{state, worker_id, version}` and `tasks[].{id, state, worker_id, version, trace?}` ([fixture](./kafka-connect-api/fixtures/connectors-expand-status.json)). The failing connector's own state stays RUNNING while its task is FAILED with a Java stack trace whose first line is the cause: "ConnectException: Couldn't find or create file ...". No connectors gives `{}`.
- **Learned:** one request yields everything F35-B1 needs, without configuration. `expand=info` would add the configuration and must not be used.

### 5. Pause and resume — 2026-11-09
- **Request:** `PUT /connectors/{name}/pause`, then `PUT /connectors/{name}/resume`
- **Result:** 202 with an empty body each; a few seconds later connector and task states are PAUSED, then RUNNING.
- **Learned:** pause and resume are asynchronous acceptances; the UI must refresh rather than assume the new state.

### 6. Restarts — 2026-11-09
- **Request:** `POST /connectors/{name}/restart` → 204; `POST /connectors/{name}/restart?includeTasks=true&onlyFailed=true` → 202 with the status body showing RESTARTING; `POST /connectors/{name}/tasks/{id}/restart` → 204.
- **Result:** a restart of a paused connector with `includeTasks=true` returned 202 RESTARTING and settled back to PAUSED.
- **Learned:** a plain connector restart does not restart tasks; `includeTasks=true` is what operators expect from "Restart connector". Restarting does not unpause.

### 7. Errors — 2026-11-09
- **Request:** status of an unknown connector, restart of an unknown task, pause of an unknown connector, a name containing an encoded `/`.
- **Result:** 404 `{"error_code":404,"message":"No status found for connector nope"}`, 404 `{"error_code":404,"message":"Unknown task: kafka3o-verify-running-7"}`, 404 `{"error_code":404,"message":"Unknown connector nope"}`; the encoded slash got Jetty's HTML "400 Ambiguous URI path separator".
- **Learned:** Connect errors are `{error_code, message}` JSON; names with `/` cannot be addressed at all.

## Recipe
1. Reachability: `GET {connect}/` (any 2xx).
2. List: `GET {connect}/connectors?expand=status`; map each entry to name, type, connector state and worker, and tasks with id, state, worker and the first line of any trace (cut to 500 characters). Ignore every other field.
3. Pause: `PUT {connect}/connectors/{name}/pause` (expect 202). Resume: `PUT .../resume` (202).
4. Restart a connector and its tasks: `POST {connect}/connectors/{name}/restart?includeTasks=true&onlyFailed=false` (202 or 204).
5. Restart one task: `POST {connect}/connectors/{name}/tasks/{id}/restart` (204).
6. Map Connect 404 to not found, other 4xx to a rejected action, 5xx, timeouts and connection failures to "Connect unreachable" for reads, and to an unknown outcome for lifecycle actions when no response arrived.

## Facts
- Base URL: the in-cluster Service `http://kafka-connect.kafka3o-connect-test.svc.cluster.local:8083` (plain HTTP, no authentication on the test worker). Gateway config gains an optional Connect URL; HTTPS and basic authentication can be added later for production workers.
- States seen: RUNNING, PAUSED, FAILED, RESTARTING (Connect also documents UNASSIGNED and STOPPED).
- Names: valid names cannot contain `/`; the Gateway accepts 1–249 characters without `/`, control characters or leading/trailing spaces, and escapes them in the path.
- Timing: pause, resume and restarts are accepted asynchronously and settle within seconds.

## Dead Ends
- `kubectl create --raw` through the API server service proxy: 415 Unsupported Media Type for Connect's JSON endpoints.
- Running the worker without a numeric `runAsUser` under `runAsNonRoot`.

## Open Questions
- Connect workers secured with HTTPS or basic authentication are not covered by the test worker.
- Multi-worker clusters, where `worker_id` differs per task, were not exercised.

## Spec Impact
- TECH-SPEC `## Integrations` → Kafka Connect: the recipe and facts above replace the "discovery needed" placeholder; Gateway config gains `KAFKA3O_CONNECT__URL` (optional).
- FUNC-SPEC F35: unchanged; restart of a connector includes its tasks, and configuration is never shown.
- Phases: P73 (inspect) and P74 (lifecycle) still fit; the test worker stays in place for both demos.

