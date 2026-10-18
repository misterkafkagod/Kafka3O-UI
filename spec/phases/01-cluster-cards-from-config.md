# P01 · F1-B1 + F1-B6 — Cluster cards from config, and the "no gateways" case
- **Milestone:** M1
- **Covers:** F1-AC1, F1-AC6
- **Discovery:** —
- **Status:** Building        <!-- Planned | Building | Review | Done -->

## Demo
1. In `Kafka3O-UI`, run `npm ci && npm run dev` and open http://localhost:5173.
2. Expect two cards: "Dev" (`http://localhost:8081`) and "Prod" (`http://localhost:8082`).
3. Change `public/config.json` to `{"gateways":[]}` and reload → expect "No gateways configured" with a format hint.
4. Rename `public/config.json` to `config.json.bak` and reload → expect "No gateways configured". Restore the file.

## Tasks
- [x] **T01.1 UI skeleton** — Covers: TECH-SPEC Stack (UI), Testing (UI)
  - Files: package.json (new), package-lock.json (new), .nvmrc (new), .gitignore (new), tsconfig.json (new), vite.config.ts (new), index.html (new), src/main.tsx (new), src/App.tsx (new), src/App.test.tsx (new), src/test/setup.ts (new), src/test/server.ts (new)
  - Do: `package.json` pins the exact TECH-SPEC versions (React 19.3.1, TypeScript 7.0.2, Vite 8.3.4, @vitejs/plugin-react 6.1.2, Vitest 5.0.5, Testing Library react 16.3.3 / user-event 14.6.8 / dom, jsdom 30.1.3, MSW 3.0.3); engines Node ≥ 24.21.0 and `.nvmrc` 24.21.0; scripts `dev`, `build` (`tsc --noEmit && vite build`), `test` (`vitest run`), `typecheck`. `vite.config.ts` configures Vitest (jsdom, setup file). `src/test/server.ts` exports one MSW `setupServer()`; `setup.ts` starts it with `onUnhandledRequest: "error"`, resets handlers after each test and closes it at the end. `App` renders a "Kafka3O" header; `main.tsx` is the composition root that mounts it.
  - Done when: `npm ci && npm test` passes `App.test.tsx › renders the Kafka3O header`, and `npm run build` exits 0.

- [x] **T01.2 Load and validate the gateway config** — Covers: F1-AC1, F1-AC6
  - Files: src/gateway/types.ts (new), src/gateway/HttpError.ts (new), src/gateway/fetchJson.ts (new), src/gateway/fetchJson.test.ts (new), src/config/parseGatewayConfig.ts (new), src/config/parseGatewayConfig.test.ts (new), src/config/loadGatewayConfig.ts (new), src/config/loadGatewayConfig.test.ts (new), package.json (adds @tanstack/react-query 5.104.4)
  - Do:
    - `types.ts`: data-only `GatewayEntry {id, name, url}`. `HttpError`: data-only error class carrying `status`.
    - `fetchJson(fetchFn, url, timeoutMs)` uses `AbortSignal.timeout`; non-2xx → throws `HttpError`; non-JSON body → throws. Exports the `FetchJson` function type, the injected I/O abstraction.
    - `parseGatewayConfig(raw)` returns `GatewayEntry[]` only when `raw.gateways` is an array whose entries all have non-empty string `id`, `name`, `url`, with `url` starting `http://` or `https://`, and unique `id`s; otherwise `[]`. Never throws.
    - `loadGatewayConfig(fetchJson)` fetches `/config.json` and parses it; 404, network error or non-JSON body (e.g. a static host answering with `index.html`) → `[]`.
  - Done when: `npm test -- fetchJson parseGatewayConfig loadGatewayConfig` passes, covering: valid two-gateway config, empty list, missing `gateways`, bad URL scheme, duplicate IDs, 404, HTML body, timeout.

- [x] **T01.3 Clusters page with cards or the empty state** — Covers: F1-AC1, F1-AC6
  - Files: src/hooks/useGatewayConfig.ts (new), src/hooks/useGatewayConfig.test.tsx (new), src/pages/ClustersPage.tsx (new), src/pages/ClustersPage.test.tsx (new), src/components/ClusterCard.tsx (new), src/components/ClusterCard.test.tsx (new), src/components/NoGatewaysConfigured.tsx (new), src/components/NoGatewaysConfigured.test.tsx (new), src/test/renderWithQuery.tsx (new), public/config.json (new), src/App.tsx, src/App.test.tsx, src/main.tsx
  - Do: `main.tsx` builds `fetchJson` bound to `window.fetch` with a 5 s timeout and a `QueryClient`, and passes `loadGatewayConfig` into `App` as a prop (injection). `App` provides the `QueryClient` and renders `ClustersPage`. `useGatewayConfig(load)` wraps `useQuery` with key `["config"]`. `ClustersPage` shows "Loading…", then one `ClusterCard` per entry (name, URL as text, not a link) or `NoGatewaysConfigured`, whose hint shows the example `{"gateways":[{"id":"dev","name":"Dev","url":"http://localhost:8081"}]}`. `public/config.json` lists Dev (8081) and Prod (8082). `renderWithQuery` gives each test a fresh `QueryClient` with `retry: false`.
  - Done when: `npm test` passes `ClustersPage.test.tsx` with MSW serving `/config.json` — two gateways → "Dev" and "Prod" cards (F1-AC1); 404 → "No gateways configured" (F1-AC6); `{"gateways":[]}` → "No gateways configured" (F1-AC6) — plus the `ClusterCard`, `NoGatewaysConfigured` and `useGatewayConfig` tests; `npm run build` exits 0.

## Review
