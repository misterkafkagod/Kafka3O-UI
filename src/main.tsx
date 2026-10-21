import { QueryClient } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { loadGatewayConfig } from "./config/loadGatewayConfig";
import { fetchJson } from "./gateway/fetchJson";
import { getCluster } from "./gateway/getCluster";

const gatewayTimeoutMs = 5000;
const statusRefreshMs = 15_000;
const boundFetchJson = (url: string) => fetchJson(window.fetch.bind(window), url, gatewayTimeoutMs);
const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App
      queryClient={queryClient}
      loadGatewayConfig={() => loadGatewayConfig(boundFetchJson)}
      getCluster={(gatewayUrl) => getCluster(boundFetchJson, gatewayUrl)}
      statusRefreshMs={statusRefreshMs}
    />
  </StrictMode>,
);
