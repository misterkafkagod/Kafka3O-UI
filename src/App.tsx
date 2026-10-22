import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Link, Route, Routes } from "react-router";
import type { LoadGatewayConfig } from "./config/loadGatewayConfig";
import type { GetCluster } from "./gateway/getCluster";
import { ClusterPage } from "./pages/ClusterPage";
import { ClustersPage } from "./pages/ClustersPage";

type AppProps = {
  queryClient: QueryClient;
  loadGatewayConfig: LoadGatewayConfig;
  getCluster: GetCluster;
  statusRefreshMs: number;
};

export function App({ queryClient, loadGatewayConfig, getCluster, statusRefreshMs }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <header>
        <h1>
          <Link to="/">Kafka3O</Link>
        </h1>
      </header>
      <Routes>
        <Route
          path="/"
          element={
            <ClustersPage
              loadGatewayConfig={loadGatewayConfig}
              getCluster={getCluster}
              statusRefreshMs={statusRefreshMs}
            />
          }
        />
        <Route
          path="/clusters/:gatewayId"
          element={
            <ClusterPage
              loadGatewayConfig={loadGatewayConfig}
              getCluster={getCluster}
              statusRefreshMs={statusRefreshMs}
            />
          }
        />
      </Routes>
    </QueryClientProvider>
  );
}
