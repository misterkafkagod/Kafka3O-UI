# P72 · F15-B2 + F15-B3 — Apply the previewed reset
- **Milestone:** M12
- **Covers:** F15-AC2, F15-AC3, apply portion of F15-AC4
- **Discovery:** —
- **Status:** Building

## Demo
1. In the Gateway repository, run `go test ./internal/kafka -run ApplyOffsetReset`, `go test ./internal/httpapi -run OffsetResetApply` and `go test ./cmd/gateway`.
2. In the UI, preview a reset, select "Apply reset" and confirm: the group's offsets change to the previewed targets; a changed offset since the preview, or an active group, is refused; on a Production cluster the reason prompt appears and cancel sends nothing.
3. On EKS-D after the user's `deploy.sh`: reset a synthetic inactive group on `kafka3o-m10-verify` on Kafka A and on Kafka B (with a reason), and find both attempts with their outcomes in the audit.

## Tasks
- [x] **T72.1 Apply in the Gateway** — Covers: F15-AC2, apply portion of F15-AC4
  - Files: Gateway internal/kafka/ensure_group_inactive.go (new, shared with the preview), internal/kafka/ensure_group_inactive_test.go (new), internal/kafka/compute_offset_reset_preview.go, internal/kafka/commit_offset_reset.go (new), internal/kafka/commit_offset_reset_test.go (new), internal/groups/offset_reset.go, internal/groups/commit_offset_reset.go (new, interface), internal/groups/apply_offset_reset.go (new, timeout wrapper with test), cmd/gateway/main.go (preview wiring for the shared check)
  - Do: `ApplyOffsetReset.Execute(ctx, group, topic, partitions)` takes each partition's expected current offset (or none) and target. It rechecks that the group exists and has no members, refuses with `ErrStalePreview` when any committed offset differs from the expected one or a target is outside the partition's current start–end range, then commits all targets in one request. A commit error for any partition is returned; a request without a response becomes `ErrOutcomeUnknown`.
  - Done when: `go test ./internal/kafka -run 'ApplyOffsetReset|EnsureGroupInactive' ./internal/groups` (run per package) passes, covering success, stale offsets, out-of-range targets, an active group, partition commit errors and an unknown outcome.
- [ ] **T72.2 Apply route and authorization** — Covers: F15-AC3, apply portion of F15-AC4
  - Files: Gateway internal/httpapi/register_apply_offset_reset.go (new), internal/httpapi/register_apply_offset_reset_test.go (new), internal/httpapi/offset_reset_api_types.go, internal/httpapi/new_offset_reset_problem.go, internal/authorization/policy.go, internal/authorization/classify_action.go, internal/authorization/evaluate_policy_test.go, internal/gatewayauth/route_actions.go, internal/gatewayauth/classify_route_test.go, cmd/gateway/gateway_routes.go, cmd/gateway/main.go, cmd/gateway/route_catalog_test.go
  - Do: `POST /api/v1/consumer-groups/{group}/offset-reset` with `{topic, partitions: [{partition, expectedOffset: string|null, targetOffset: string}]}` applies the reset and returns the committed offsets; 400 invalid body, 404 unknown group or topic, 409 `group_active` or `stale_preview`, 503 `cluster_unreachable` before Kafka was asked or `offset_reset_unknown` when the outcome is unknown. The action `consumer_groups.offsets.reset` is a Kafka write, so secured Gateways require OPERATOR, or ADMIN plus a reason on Production, and record intent and outcome through the existing delegation.
  - Done when: `go test ./internal/httpapi -run OffsetResetApply`, `go test ./internal/gatewayauth`, `go test ./internal/authorization` and `go test ./cmd/gateway` pass; then `go test ./...` passes.
- [ ] **T72.3 Apply from the preview** — Covers: F15-AC2, F15-AC3, apply portion of F15-AC4
  - Files: UI src/gateway/applyOffsetReset.ts (new), src/gateway/applyOffsetReset.test.ts (new), src/gateway/describeOffsetResetError.ts, src/gateway/describeOffsetResetError.test.ts, src/components/OffsetResetPreview.tsx, src/components/OffsetResetPreview.test.tsx, src/components/ConsumerGroupDetails.tsx, src/components/ConsumerGroups.tsx, src/pages/ClusterPage.tsx, src/App.tsx, src/main.tsx
  - Do: Under a preview, "Apply reset" asks for confirmation naming the group, topic and partition count, then sends the previewed targets with their expected current offsets. Success shows "Offsets reset" and reloads the group; a stale preview asks to preview again; an active group, a denial, a canceled Production reason ("Canceled; nothing was sent") and an unknown outcome ("The reset may have been applied; check the group's offsets before retrying") each have their own message. Canceling the confirmation sends nothing.
  - Done when: `npx vitest run src/gateway/applyOffsetReset.test.ts src/gateway/describeOffsetResetError.test.ts src/components/OffsetResetPreview.test.tsx` passes, covering the request body, confirm and cancel, reload after success and each failure message; then `npm test` and `npm run build` pass.

## Review
