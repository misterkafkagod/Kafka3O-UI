# Discovery: kafka-tls-scram-dev
- **Goal:** Connect the gateway's Kafka client to a disposable Kafka broker using verified TLS and SASL.
- **Done when:** TLS plus SCRAM-SHA-512 succeeds against the same Kafka distribution used by the integration tests, with the other promised security modes checked.
- **Phase:** P13
- **Status:** Done
- **Secrets used:** A random, disposable broker password and key-store password, generated inside the test pod. No real credentials were used.

## Log
### 1. Inspect the Kafka image — 2026-11-05
- **Tried:** Run the existing `apache/kafka:4.3.1` image in a disposable EKS-D pod and inspect its tools.
- **Command:** `kubectl exec <test-pod> -- bash -c 'command -v java; command -v keytool; command -v openssl; ls /opt/kafka/bin/kafka-storage.sh /opt/kafka/bin/kafka-server-start.sh'`
- **Result:** Java, keytool, OpenSSL, and both Kafka scripts are available.
- **Learned:** A secured single-node broker can be set up without an additional image.

### 2. Start a secured single-node broker — 2026-11-05
- **Tried:** Generate a short-lived certificate for `127.0.0.1` and `localhost`, and configure TLS, SASL/TLS and SASL-only listeners bound to the pod's loopback interface.
- **Command:** Run `kafka-storage.sh format` with `--add-scram` entries for both SCRAM mechanisms, then start `kafka-server-start.sh` with listener-specific JAAS settings. All generated credentials and configuration containing them were kept in an in-memory pod volume.
- **Result:** Kafka started and all three listeners became ready.
- **Learned:** Kafka 4.3.1 can bootstrap SCRAM credentials during KRaft storage formatting; SASL PLAIN requires a listener-specific JAAS user entry.

### 3. Connect with franz-go — 2026-11-05
- **Tried:** Send a metadata request over loopback-only SSH and Kubernetes forwards using the generated public certificate and disposable credentials.
- **Command:** Configure franz-go with `kgo.SeedBrokers`, `kgo.DialTLSConfig` and, where needed, `kgo.SASL`; request `kmsg.MetadataRequest`.
- **Result:** TLS with SCRAM-SHA-512, SCRAM-SHA-256 and PLAIN all passed; TLS alone and SCRAM-SHA-512 without TLS also passed. Each returned the expected single-node cluster ID.
- **Learned:** `kgo.DialTLSConfig` validates each broker's advertised hostname or IP by default. Existing franz-go packages provide all required mechanisms.

## Recipe
1. Generate a short-lived test certificate whose SAN matches the broker's advertised host and trust its public certificate in the client. Never disable certificate or hostname verification.
2. Configure separate Kafka listener security protocols. Bootstrap SCRAM users with `kafka-storage.sh format --add-scram`; configure PLAIN users in the corresponding listener's JAAS setting.
3. Use `kgo.DialTLSConfig` for TLS and `kgo.SASL` with `plain.Auth`, `scram.Auth.AsSha256Mechanism`, or `scram.Auth.AsSha512Mechanism` as configured.
4. Forward only loopback ports for the disposable test broker. Keep test credentials and private keys ephemeral and out of logs, manifests and source control.

## Facts
- TLS and SASL are independently configurable. SASL PLAIN without TLS exposes credentials and must only be used on an isolated test network.
- A custom CA must match the advertised broker hostname or IP, not just the bootstrap address.
- The gateway creates separate clients for administration, writes, and bounded message reads; all three need the same transport and authentication options.
- No new gateway dependency is needed.

## Dead Ends
- None in the broker configuration. The first ownership-check command combined a resource name and a label selector, which `kubectl` rejects; listing namespaces by label and matching the exact owned namespace worked.

## Open Questions
- Mutual TLS client authentication was not required by this phase and was not tested.
- Trusted browser deployment of the gateway's separate HTTPS certificate remains a distinct verification item.

## Spec Impact
- Add explicit Kafka TLS and SASL configuration and environment-only SASL passwords; retain plaintext defaults.
- Verify client, producer, and message-reader behavior against the secured broker, including rejected credentials and untrusted certificates.
