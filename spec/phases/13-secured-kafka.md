# P13 · F1-B7 — Connect to secured Kafka clusters
- **Milestone:** M1
- **Covers:** F1-AC7
- **Discovery:** [kafka-tls-scram-dev](../discovery/kafka-tls-scram-dev.md)
- **Status:** Done

## Demo
1. Start a disposable Kafka broker requiring TLS and SCRAM-SHA-512 with a certificate trusted by the gateway and a synthetic test credential.
2. Start the gateway with that broker's security configuration and open its cluster card; it shows **Healthy**.
3. Verify wrong credentials and an untrusted broker certificate fail rather than falling back to plaintext.

## Tasks
- [x] **T13.1 Configure every Kafka client** — Covers: F1-AC7
  - Files: gateway config and Kafka client, producer, bounded-reader constructors and their tests; gateway composition root and directly affected integration tests.
  - Do: Add validated TLS and SASL PLAIN/SCRAM settings with an environment-only password. Preserve plaintext defaults and apply the same verified transport and authentication settings to administrative, write and message-reader clients.
  - Done when: `go test ./internal/config ./internal/kafka ./cmd/gateway` passes configuration, invalid-input and client-option tests; integration-tagged packages compile.
- [x] **T13.2 Verify a secured real broker** — Covers: F1-AC7
  - Files: gateway integration test fixture, secured Kafka test, Kubernetes test manifest and runner.
  - Do: Test TLS with all three SASL mechanisms, TLS alone and SASL alone on a disposable broker; reject bad credentials and untrusted certificates; exercise metadata, writes and all bounded message-read paths.
  - Done when: The secured integration test passes against a fresh broker and the pre-existing plaintext message-read integration test still passes against a separate fresh broker.
- [x] **T13.3 Run the demo and update documentation** — Covers: F1-AC7
  - Files: gateway configuration and deployment documentation; this phase, discovery and the shared roadmap/technical spec.
  - Do: Verify gateway cluster health with TLS plus SCRAM-SHA-512, document configuration and security limitations, and record remaining verification debt accurately.
  - Done when: The demo results and vulnerability-scan status are recorded without claiming unrun checks passed.
- [x] **T13.4 Upgrade the TLS verification toolchain** — Covers: F1-AC7, TECH-SPEC CVE policy
  - Files: gateway `go.mod`, `Dockerfile`, and this phase and technical spec.
  - Do: Upgrade Go to 1.27.3, which fixes the `crypto/x509` advisory affecting TLS certificate verification, and keep the build image aligned.
  - Done when: The gateway suite passes with Go 1.27.3, the official build-image tag exists, and `govulncheck` reports no called vulnerabilities.

## Review
- **Demo:** Passed on 2026-11-05 against a disposable EKS-D Kafka pod. The actual UI cluster card showed Healthy with TLS and SCRAM-SHA-512, and the synthetic browser credential was removed afterwards. The browser used a test-only override for the gateway's HTTPS certificate; browser trust remains unverified. The UI dev server used Node 22, while the supported Node 24 tests and build were verified separately.
- **Production gateway:** A Go 1.27.3 Linux gateway binary ran inside the test pod, rejected anonymous requests, and returned the expected cluster and broker over HTTPS verified with a disposable CA. Its Kafka connection used verified TLS and SCRAM-SHA-512.
- **Tests:** Gateway unit and Kafka race suites passed, including rejection of a mismatched broker hostname. Secured real-broker checks passed for TLS with PLAIN, SCRAM-SHA-256 and SCRAM-SHA-512, TLS alone, all three SASL-only modes, invalid credentials, untrusted certificates, writes, and latest/positioned/search reads. The authenticated gateway lifecycle and a separate fresh-broker plaintext message-read regression passed.
- **Vulnerability scan:** `govulncheck` on Go 1.27.3 found 0 called vulnerabilities and 1 uncalled module-level advisory; `npm audit` found 0 vulnerabilities. A disposable gateway image built on EKS-D with Kaniko had 0 high/critical findings in its Debian packages and Go binary with Trivy 0.75.0. Lower/unknown severities were not included; the image was not pushed or started as a container.
- **Notes:** Kafka TLS client certificates are not supported. The Docker-only stopped-broker test and trusted-certificate browser deployment remain verification debt.
