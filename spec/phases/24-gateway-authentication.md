# P24 · F12 — Authenticate gateway requests over TLS
- **Milestone:** M5
- **Covers:** F12-AC1, F12-AC2, F12-AC3
- **Discovery:** —
- **Status:** Building

## Demo
1. Start a gateway using a trusted TLS certificate/key and a strong environment-provided token; verify anonymous liveness succeeds and an unauthenticated API call receives 401.
2. Enter the token in the UI and verify the corresponding cluster loads; remove it and verify access is denied again.

## Tasks
- [x] **T24.1 Define secure gateway configuration** — Covers: F12-AC1
  - Files: Gateway config types/load tests, secure-configuration validation and tests (new)
  - Do: Read certificate/key file paths and an environment-only bearer token; validate token syntax and minimum length, and load the TLS key pair without exposing the token. Document that token entropy must come from a secure random generator.
  - Done when: focused config tests cover valid and missing/invalid token and certificate cases and `go test ./...` passes.
- [ ] **T24.2 Implement gateway authentication** — Covers: F12-AC1, F12-AC3
  - Files: Gateway HTTP authentication middleware/tests (new), CORS handler/tests
  - Do: Implement constant-time bearer-token verification, anonymous liveness, safe 401 problem responses, and allowed-origin preflight with the Authorization header.
  - Done when: HTTP tests cover valid/invalid tokens, protected endpoints, anonymous liveness, preflight, and non-disclosure; `go test ./...` passes.
- [ ] **T24.3 Implement session credentials and secure requests** — Covers: F12-AC2, F12-AC3
  - Files: UI session credential store and tests (new), authenticated request action/tests (new), gateway error classification/tests
  - Do: Store tokens per gateway in session storage, require a secure UI context and HTTPS gateway URLs, prevent redirect forwarding, and surface authentication errors.
  - Done when: focused UI tests cover storage failures, gateway isolation, token removal, HTTPS and redirect policy, and 401 handling; `npm test` and `npm run build` pass.
- [ ] **T24.4 Wire gateway TLS and UI authentication** — Covers: F12-AC1, F12-AC2, F12-AC3
  - Files: Gateway composition root/config example/deployment documentation, UI composition root, cluster/topic views, credential form/tests, runtime config, related tests
  - Do: Enable TLS and authentication by default, provide per-gateway token entry/removal from every relevant view, clear cached gateway data on credential changes, and document external certificate/token provisioning.
  - Done when: Gateway and UI suites and UI build pass; tests verify real production wiring, cache reset, preflight, 401 recovery, and TLS startup failures.

## Review
