# P06 · F2-B1 — Cluster page with brokers and controller
- **Milestone:** M1
- **Covers:** F2-AC1
- **Discovery:** —
- **Status:** Done        <!-- Planned | Building | Review | Done -->

## Demo
1. With the dev stack up and `npm run dev`, click the "Dev" card name.
2. URL is `/clusters/dev`; page shows the cluster ID, **Controller: 1**, and a broker table row `1 · kafka-dev:9092 · —`.
3. Click "Kafka3O" in the header → back to the overview.

## Tasks
- [x] **T06.1 Routing and card link** — Covers: F2-AC1
  - Files: package.json, package-lock.json (adds react-router 8.4.0), src/main.tsx, src/App.tsx, src/App.test.tsx, src/components/ClusterCard.tsx, src/components/ClusterCard.test.tsx, src/test/renderWithQuery.tsx
  - Do: `main.tsx` wraps `App` in `BrowserRouter`. `App` renders the header "Kafka3O" as a link to `/` and `Routes` with `/` → `ClustersPage`. The card name becomes a `Link` to `/clusters/{id}`; the gateway URL stays plain text. `renderWithQuery` accepts an optional initial route and wraps in `MemoryRouter`.
  - Done when: `npm test` passes `ClusterCard` › "links the name to /clusters/dev", `App` › "header links to /", plus all earlier tests; build exits 0.

- [x] **T06.2 Cluster page with brokers** — Covers: F2-AC1
  - Files: src/pages/ClusterPage.tsx (new), src/pages/ClusterPage.test.tsx (new), src/components/ClusterDetails.tsx (new), src/components/ClusterDetails.test.tsx (new), src/config/findGatewayById.ts (new, added in build: inline-predicate rule), src/config/findGatewayById.test.ts (new), src/components/BrokerTable.tsx (new), src/components/BrokerTable.test.tsx (new), src/brokers/compareBrokersById.ts (new), src/brokers/compareBrokersById.test.ts (new), src/App.tsx, src/App.test.tsx
  - Do: `ClusterPage` reads `:gatewayId`, loads config via `useGatewayConfig`, finds the entry; "Loading…" while loading; renders `ClusterDetails` when found (not found is P08 — renders nothing until then). `ClusterDetails` shows name, URL, "Cluster ID: …", "Controller: N" and `BrokerTable`, using `useClusterStatus` with the same query key as the card (shared cache) and a `statusRefreshMs` prop passed from `main.tsx` through `App` → `ClusterPage` → `ClusterDetails` (amended after P05 made the interval a required argument); "Checking…" while loading. `BrokerTable`: columns ID, Host:Port, Rack ("—" when empty), sorted by ID (copy, using `compareBrokersById`). `App` adds route `/clusters/:gatewayId`.
  - Done when: `npm test` passes `ClusterPage` › "shows cluster ID, controller and brokers in ID order (F2-AC1)" (MemoryRouter at `/clusters/dev`, MSW brokers 3, 1, 2 with controller 2 → rows 1, 2, 3 and "Controller: 2"), `BrokerTable` sort and rack-dash cases, `App` › "clicking the Dev card opens its cluster page"; build exits 0.

## Review
- **Demo:** passed (user, 2026-10-24) — run by Claude in headless Chromium against the dev stack, screenshots reviewed by the user: `/clusters/dev` showed the cluster ID, Controller: 1 and row `1 · kafka-dev:9092 · —`; header link returned to the overview
- **Vulnerability scan:** `npm audit` (react-router 8.4.0 added): 0 findings
- **Notes:**
  - The cluster page and the card share the cluster-status query key, so the page shows cached data instantly after a card click.
