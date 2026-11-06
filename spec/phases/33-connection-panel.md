# P33 · F20-B1 + F20-B2 — Manage gateway credentials in an accessible connection panel
- **Milestone:** M6
- **Covers:** F20-AC1, F20-AC2
- **Discovery:** —
- **Status:** Done

## Demo
1. Open connection management from the shell and from a gateway's authentication prompt; verify the named dialog, selected gateway context, initial focus, contained keyboard focus, Escape/close behavior and focus restoration.
2. Enter credentials for both test gateways, then replace or remove one; verify the other remains stored, the token is never displayed or placed in a URL, and gateway data refreshes.

## Tasks
- [x] **T33.1 Open the existing credential forms in an accessible connection dialog** — Covers: F20-AC1
  - Files: `src/App.tsx`, `src/components/AppShell.tsx`, `src/components/AppShell.module.css`, `src/components/GatewayCredentialsPanel.tsx`, `src/components/GatewayCredentialsPanel.module.css` (new), `src/components/GatewayCredentialForm.tsx`, `src/components/restoreDialogFocus.ts` (new), `src/test/setup.ts`, and their tests
  - Do: Replace the permanent header forms with a named native dialog containing the existing per-gateway forms. Focus the first token input, discard unsaved input when closed, and preserve Escape, close, focus containment and restoration, with a fallback if the invoker no longer exists.
  - Done when: `npm test -- src/components/GatewayCredentialsPanel.test.tsx src/components/GatewayCredentialForm.test.tsx src/components/restoreDialogFocus.test.ts src/App.test.tsx` and `npm run build` pass; browser checks confirm dialog focus behavior.
- [x] **T33.2 Open the selected gateway from its authentication prompt** — Covers: F20-AC1, F20-AC2
  - Files: `src/App.tsx`, `src/components/AppShell.tsx`, `src/components/GatewayConnectionContext.ts` (new), `src/components/GatewayCredentialAction.tsx` (new), `src/components/ClusterCard.tsx`, `src/test/renderWithQuery.tsx`, and their tests
  - Do: Add a gateway-specific action to the authentication-required card using a shared connection action, open the dialog with that gateway identified and focused, and verify that editing or removing one gateway's token preserves the other gateway's session credential and existing query-cache reset behavior.
  - Done when: `npm test -- src/components/GatewayCredentialAction.test.tsx src/components/ClusterCard.test.tsx src/components/GatewayCredentialsPanel.test.tsx src/components/GatewayCredentialForm.test.tsx src/App.test.tsx` and `npm run build` pass.
- [x] **T33.3 Offer contextual credential recovery on other authentication prompts** — Covers: F20-AC1, F20-AC2
  - Files: `src/components/ErrorWithRetry.tsx`, read/search callers, `src/components/CreateTopic.tsx`, `src/components/DeleteTopic.tsx`, `src/components/ProduceTopicMessage.tsx`, and their tests
  - Do: Reuse the gateway-specific action for 401 responses on detail, message, consumer, search and write screens without automatically retrying writes or changing other failure outcomes.
  - Done when: `npm test -- src/components/ErrorWithRetry.test.tsx src/components/ClusterDetails.test.tsx src/components/TopicList.test.tsx src/components/ConsumerGroups.test.tsx src/components/TopicConsumerGroups.test.tsx src/components/SearchTopicMessages.test.tsx src/components/CrossClusterTopicSearch.test.tsx src/components/CreateTopic.test.tsx src/components/DeleteTopic.test.tsx src/components/ProduceTopicMessage.test.tsx src/pages/TopicPage.test.tsx src/App.test.tsx` and `npm run build` pass.

## Review
- **Demo:** In the browser, the named native modal hid forms while closed, focused the first or selected gateway's password field, contained forward and reverse keyboard focus, blocked background focus, fit a 320px viewport, and restored focus after Escape or Close. Unsaved input was discarded on close.
- **Gateway isolation:** Synthetic credentials for two HTTPS gateways remained separate when one was replaced and removed; tokens were not rendered. Authentication actions selected the correct gateway on overview, broker, topic, message, linked-message, consumer and cross-cluster search views. Write-screen tests verified credential correction never resubmits a write.
- **Validation:** All 295 UI tests and the production build passed. Existing gateway query-cache reset and in-flight response tests passed. Browser checks used synthetic fixtures; the EKS-D UI update remains deferred until the end of M6.
- **Vulnerability scan:** Not run; P33 changes no dependencies and is not the final M6 phase.
- **Notes:** An explicit Escape handler was needed for the embedded browser even though the native modal otherwise contained focus. Existing write-handler structure was retained rather than refactoring unrelated M5 logic.
