# P61 · F28-B1 + F28-B3 + F30-B1 — Access-management and classification UI
- **Milestone:** M10
- **Covers:** UI portion of F28-AC4, additive-model explanation of F28-AC2, F30-B1 display
- **Discovery:** —
- **Status:** Done

## Existing baseline and boundaries
P54 and P60 expose audited, local-global-ADMIN-only access and cluster
administration routes on the undeployed Console. The authentication-only
preview (`VITE_KAFKA3O_CONSOLE_AUTH_PREVIEW`) is the only UI that talks to
the Console. This phase adds administration pages to that signed-in preview.
The server remains the only authority: the UI never infers permissions and
renders a 403 as an explanation, not as an outage. The M9 manual UI,
Kafka routes and Gateway enforcement are unchanged (P55).

## Demo
1. In the preview, a local global ADMIN opens Access management and sees
   identities with grants labelled by source (direct or Cognito group) and
   scope (all clusters or a cluster), plus the additive-model explanation.
2. Changing a grant, group mapping or cluster classification shows a
   confirmation naming the subject, scope and before/after value;
   classification also requires a reason. Canceling sends no request.
3. A signed-out session (401), non-global ADMIN (403), stale value (409),
   audit outage and unknown outcome (503) each show a distinct message; an
   unknown outcome tells the user to investigate rather than retry.

## Tasks
- [x] **T61.1 Console administration client** — Covers: F28-AC4
  - Files: `src/console/ConsoleAdmin.ts`, `ConsoleAdminError.ts`,
    `requestConsoleAdmin.ts`, `parseAccessListing.ts`,
    `parseClusterListing.ts`, `parseAccessChangeResult.ts`, `listAccess.ts`,
    `changeRoleGrant.ts`, `changeGroupMapping.ts`, `listClusters.ts`,
    `classifyCluster.ts` (all new) and tests.
  - Do: Same-origin HTTPS requests with cookie credentials, no redirects or
    caching, CSRF on PUT, strict response parsing. Map 401, 403
    (`global_admin_required`, `password_change_required`,
    `self_access_change`), 409 (`policy_conflict`, `last_global_admin`), 404,
    400 (`change_reason_required`), 503 audit unavailability and unknown
    outcomes (including lost PUT responses) to distinct error codes that keep
    the operation ID.
  - Done when: `npm test -- src/console/requestConsoleAdmin.test.ts src/console/parseAccessListing.test.ts src/console/parseClusterListing.test.ts src/console/ConsoleAdminClient.test.ts`
    passes.
- [x] **T61.2 Access management view** — Covers: F28-AC2, F28-AC4
  - Files: `src/components/AccessManagement.tsx`, `AccessManagement.module.css`,
    `src/console/describeAdminError.ts`, `src/console/describeAccessScope.ts`
    (all new) and tests.
  - Do: Show identities, direct grants and group mappings by source and
    scope, explain the additive model, and change a direct grant or group
    mapping through an injected confirmation naming subject, scope and
    before/after role; send the current role as the expectation, reload after
    success and send nothing on cancel.
  - Done when: `npm test -- src/components/AccessManagement.test.tsx src/console/describeAdminError.test.ts src/console/describeAccessScope.test.ts`
    passes.
- [x] **T61.3 Cluster classification view** — Covers: F30-B1
  - Files: `src/components/ClusterClassification.tsx`,
    `ClusterClassification.module.css`, `src/console/describeEnvironment.ts`
    (new) and tests.
  - Do: List registered clusters with an authoritative environment badge
    (Production, Non-production, Unclassified — writes blocked) and active
    state; classify through a confirmation naming the cluster and before/after
    environment with a required reason; cancel or a missing reason sends
    nothing.
  - Done when: `npm test -- src/components/ClusterClassification.test.tsx src/console/describeEnvironment.test.ts`
    passes.
- [x] **T61.4 Administration in the signed-in preview** — Covers: F28-AC4, F30-B1
  - Files: `src/components/ConsoleSessionGate.tsx`, its tests, `src/main.tsx`,
    `src/console/previewAdministrationIntegration.test.ts` (new), Gateway
    `cmd/console/preview_fixture_test.go`, Gateway `internal/console/README.md`.
  - Do: Render Access management and Cluster classification for a signed-in
    preview session without a pending password change; a 401 returns to
    sign-in. The fixture optionally registers synthetic clusters; the opt-in
    integration test drives the real Console admin routes over verified HTTPS.
  - Done when: focused ConsoleSessionGate tests, the opt-in
    `KAFKA3O_PREVIEW_INTEGRATION=1` administration test, `npm test`,
    `npm run build` (default and preview) and `go test ./cmd/console` pass.

## Review
- **Demo:** passed (auto-approved under the user's standing M10 instruction,
  2026-11-08; run by Claude, not observed live). The opt-in
  `previewAdministrationIntegration` test evaluated the built preview bundle
  against the real Console over verified HTTPS with two synthetic registered
  clusters: administration stayed hidden until the temporary password was
  replaced; `prod` showed "Unclassified — writes blocked"; a canceled
  classification sent no PUT; a confirmed one with a reason became
  Production; self-change showed the 403 explanation; granting alice `prod`
  ADMIN named subject, scope and before/after and listed "(direct)"; a
  concurrent change produced a 409 message and reload. Component tests
  covered the additive-model text, source/scope labels, distinct
  401/403/409/503-audit/unknown-outcome messages and the 401 return to
  sign-in.
- **Regression:** UI suite 418 passed, 5 opt-in skipped; all four opt-in
  preview integrations (local, Cognito, outage, administration) passed;
  default and preview builds passed; full Gateway suite passed. The existing
  local preview test now waits for the administration reads before revoking
  its session and allows those two read routes.
- **Convention check:** passed.
- **Vulnerability scan:** not required; no dependency manifests changed.
- **Not run:** native-browser acceptance at 320/768/1440 px, light/dark
  themes and 200% zoom (jsdom only); Cognito-sourced administrators; Kafka
  environment badges on cluster pages (P55); deployment.

