# P17 · F5-B2 — Choose message value representation
- **Milestone:** M2
- **Covers:** F5-AC2
- **Discovery:** —
- **Status:** Done        <!-- Planned | Building | Review | Done -->

## Demo
1. Open a message with a valid JSON value and switch the representation between Text, JSON, and Base64.
2. Select JSON for a non-JSON value; verify an invalid-JSON indication appears and the original remains inspectable in Text or Base64.

## Tasks
- [x] **T17.1 Message value formats** — Covers: F5-AC2
  - Files: `src/messages/formatMessageValue.ts` (new), `src/messages/formatMessageValue.test.ts` (new), `src/components/MessageTable.tsx` (from T16.5), `src/components/MessageTable.test.tsx` (from T16.5)
  - Do: Add a Text/JSON/Base64 selector for message values. Decode the API's base64 bytes for Text and JSON, pretty-print valid JSON, and show an invalid-JSON indication with the decoded text still available and the original base64 accessible.
  - Done when: `npm test -- formatMessageValue MessageTable` passes all three formats and invalid-JSON cases; `npm test` and `npm run build` exit 0.

## Review
- `npm test -- formatMessageValue MessageTable` passed (7 tests), the full suite passed (127 tests), and `npm run build` passed.
