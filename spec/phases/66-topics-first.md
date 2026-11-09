# P66 · F46-B3 + F46-B4 — Clusters open on Topics, and Create topic is spaced
- **Milestone:** M11
- **Covers:** F46-AC3, F46-AC4
- **Discovery:** —
- **Status:** Building

## Demo
1. Open a cluster from the clusters page.
2. Expect the Topics tab first and selected at `/clusters/<id>`, tabs ordered Topics, Brokers, Consumer groups, Broker configuration, and the brokers at `/clusters/<id>/brokers`.
3. Expect at least 1rem between "Create topic" and the topic filters, collapsed and expanded.

## Tasks
- [x] **T66.1 Topics as the cluster's first tab** — Covers: F46-AC3
  - Files: src/components/ClusterTabs.tsx, src/components/ClusterTabs.test.tsx, src/App.tsx, src/components/AppShell.tsx, src/App.test.tsx, src/AdministrationRoutes.test.tsx, src/pages/ClusterPage.test.tsx
  - Do: Tabs are ordered Topics, Brokers, Consumer groups, Broker configuration; Brokers links to `/clusters/<id>/brokers`. `/clusters/<id>` and `/clusters/<id>/topics` render the topic view with Topics selected; `/clusters/<id>/brokers` renders the brokers and controller with a "Brokers" breadcrumb. Tests that opened a cluster expecting brokers use the brokers address.
  - Done when: `npx vitest run src/components/ClusterTabs.test.tsx src/App.test.tsx src/AdministrationRoutes.test.tsx src/pages/ClusterPage.test.tsx` passes, covering tab order, the default Topics view, the brokers address and the breadcrumb.
- [x] **T66.2 Space below Create topic** — Covers: F46-AC4
  - Files: src/pages/ClusterPage.tsx, src/pages/ClusterPage.module.css (new)
  - Do: The "Create topic" disclosure gets a bottom margin of 1.25rem, so it is separated from the topic filters whether collapsed or open.
  - Done when: `npm test` and `npm run build` pass, and Chromium measures at least 16 px between the disclosure and the filters in both states.

## Review
