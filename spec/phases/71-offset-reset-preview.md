# P71 · F15-B1 + F15-B3 — Preview a consumer offset reset
- **Milestone:** M12
- **Covers:** F15-AC1, preview portion of F15-AC4
- **Discovery:** —
- **Status:** Building

## Demo
1. In the Gateway repository, run `go test ./internal/kafka -run OffsetResetPreview ./internal/httpapi -run OffsetResetPreview ./internal/gatewayauth -run ClassifyRoute -v`.
2. In the UI, open a consumer group, choose a topic and earliest, latest or a date and time, and select Preview: each partition lists its current and target offset; an active group shows "Stop the group's consumers first".
3. On EKS-D after the user's `deploy.sh`, preview a synthetic inactive group on `kafka3o-m10-verify` through the secured console.

## Tasks
- [x] **T71.1 Preview computation in the Gateway** — Covers: F15-AC1, preview portion of F15-AC4
  - Files: Gateway internal/groups/offset_reset.go (new, data types and errors), internal/groups/preview_offset_reset.go (new, interface), internal/groups/compare_partition_offset_resets.go (new, with test), internal/kafka/preview_offset_reset.go (new), internal/kafka/preview_offset_reset_test.go (new)
  - Do: `PreviewOffsetReset.Execute(ctx, group, topic, target)` finds the group's protocol, refuses a group with members (`ErrGroupActive`) or an unknown group or topic (`ErrGroupNotFound`, `ErrTopicNotFound`), reads the committed offsets, and computes each partition's target from the start offsets, end offsets or the first offset at or after the timestamp (the end offset when no record is that new). A partition without a commit reports no current offset. Nothing is written.
  - Done when: `go test ./internal/kafka -run OffsetResetPreview` passes with a fake admin, covering earliest, latest, timestamp, a timestamp after the end, partitions without commits, active classic and consumer-protocol groups, unknown group and unknown topic.
- [ ] **T71.2 Preview route and authorization** — Covers: F15-AC1, preview portion of F15-AC4
  - Files: Gateway internal/httpapi/register_preview_offset_reset.go (new), internal/httpapi/register_preview_offset_reset_test.go (new), internal/authorization/policy.go, internal/authorization/classify_action.go, internal/authorization/evaluate_policy_test.go, internal/gatewayauth/classify_route.go, internal/gatewayauth/route_actions.go, internal/gatewayauth/classify_route_test.go, cmd/gateway/gateway_routes.go
  - Do: `GET /api/v1/consumer-groups/{group}/offset-reset?topic=&target=earliest|latest|timestamp&timestamp=<ms>` returns the preview; invalid targets give 400, unknown group or topic 404, an active group 409 `group_active`, Kafka failures 503. The new action `consumer_groups.offsets.preview` is a cluster read (VIEWER). The route classifier recognizes `consumer-groups/{}/offset-reset`, so the Console forwarder and secured Gateways authorize it like other reads.
  - Done when: `go test ./internal/httpapi -run OffsetResetPreview ./internal/gatewayauth -run ClassifyRoute ./internal/authorization` passes; then `go test ./...` passes.
- [ ] **T71.3 Preview in the consumer group page** — Covers: F15-AC1, preview portion of F15-AC4
  - Files: UI src/gateway/previewOffsetReset.ts (new), src/gateway/previewOffsetReset.test.ts (new), src/components/OffsetResetPreview.tsx (new), src/components/OffsetResetPreview.module.css (new), src/components/OffsetResetPreview.test.tsx (new), src/components/ConsumerGroupDetails.tsx, src/App.tsx, src/main.tsx
  - Do: The consumer group detail page gets a "Reset offsets" section: a topic select (the group's topics), a target choice (Earliest, Latest, Date and time) and Preview. The preview table lists partition, current offset (or "No commit") and target offset. A 409 shows "Stop the group's consumers first"; 404 and 503 show their messages. Nothing is applied in this phase.
  - Done when: `npx vitest run src/gateway/previewOffsetReset.test.ts src/components/OffsetResetPreview.test.tsx` passes, covering the request, the table, no-commit partitions and the 409/404/503 messages; then `npm test` and `npm run build` pass.

## Review
