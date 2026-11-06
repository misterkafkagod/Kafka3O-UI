# P30 · F19-B1 — Apply a shared visual language and system theme
- **Milestone:** M6
- **Covers:** F19-AC1
- **Discovery:** —
- **Status:** Done

## Demo
1. Open the updated manual-test UI in system light mode and system dark mode; inspect the cluster overview, a topic table, and the message view.
2. Measure normal text contrast (at least 4.5:1), large text contrast (at least 3:1), and essential control-boundary/focus contrast (at least 3:1). Confirm controls retain accessible names and status indicators include text.

## Tasks
- [x] **T30.1 Add system theme tokens and global baseline** — Covers: F19-AC1
  - Files: `src/styles.css` (new), `src/main.tsx`
  - Do: Define light/dark theme tokens, system preference selection, typography and baseline normalization without adding theme persistence or a styling dependency.
  - Done when: `npm run build` passes and the built app follows both system color-scheme preferences.
- [x] **T30.2 Style the shared shell and page primitives** — Covers: F19-AC1
  - Files: `src/components/AppShell.module.css` (new), `src/components/AppShell.tsx` (from T28.1)
  - Do: Apply token-based, shell-scoped CSS Module styles for page surfaces, headings, tables, forms, actions and status indicators across existing routes; retain accessible names and text labels, with visible focus boundaries.
  - Done when: `npm test -- src/App.test.tsx` and `npm run build` pass; browser contrast measurements meet all three thresholds in both themes.

## Review
- **Demo:** The production preview rendered the overview, topic list and message view in system light and dark themes using harmless mocked GET responses. Normal text and headings measured 14.53:1 (light) and 15.60:1 (dark); links 6.70:1 and 10.09:1; table headers 13.89:1 and 13.92:1; control borders 4.76:1 and 5.43:1. The 3px focus outline measured 6.70:1 and 11.11:1. Accessible control names and the text-based “Healthy” status were present, with no horizontal overflow at the tested viewport.
- **EKS-D:** Deployed UI ConfigMap `kafka3o-manual-ui-p30`; the UI entry point, JavaScript bundle and public Gateway config returned HTTP 200. Both forwarded Gateways passed pinned-certificate HTTPS, authentication, Kafka metadata and CORS probes. Kafka A and B StatefulSets remained Ready (1/1); no Kafka writes were made.
- **Vulnerability scan:** Not run; P30 adds no dependencies and is not the final M6 phase.
- **Notes:** Replacing the shared UI/Gateway pod rotated its in-memory credentials and certificates. The P29 ConfigMap remains available for rollback. The integrated browser cannot accept the self-signed Gateway interstitials, so live browser data access still requires manual certificate acceptance and fresh token entry.
