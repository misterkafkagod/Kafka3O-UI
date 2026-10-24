import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Link, Route, Routes } from "react-router";
import type { LoadGatewayConfig } from "./config/loadGatewayConfig";
import type { GetCluster } from "./gateway/getCluster";
import type { ListTopics } from "./gateway/listTopics";
import { ClusterPage } from "./pages/ClusterPage";
import { ClustersPage } from "./pages/ClustersPage";

type AppProps = {
  queryClient: QueryClient;
  loadGatewayConfig: LoadGatewayConfig;
  getCluster: GetCluster;
  listTopics: ListTopics;
  statusRefreshMs: number;
};

export function App({ queryClient, loadGatewayConfig, getCluster, listTopics, statusRefreshMs }: AppProps) {
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
              listTopics={listTopics}
              statusRefreshMs={statusRefreshMs}
              view="brokers"
            />
          }
        />
        <Route
          path="/clusters/:gatewayId/topics"
          element={
            <ClusterPage
              loadGatewayConfig={loadGatewayConfig}
              getCluster={getCluster}
              listTopics={listTopics}
              statusRefreshMs={statusRefreshMs}
              view="topics"
            />
          }
        />
      </Routes>
    </QueryClientProvider>
  );
}
