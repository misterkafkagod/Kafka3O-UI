import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { LoadGatewayConfig } from "./config/loadGatewayConfig";
import type { GetCluster } from "./gateway/getCluster";
import { ClustersPage } from "./pages/ClustersPage";

type AppProps = {
  queryClient: QueryClient;
  loadGatewayConfig: LoadGatewayConfig;
  getCluster: GetCluster;
};

export function App({ queryClient, loadGatewayConfig, getCluster }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <header>
        <h1>Kafka3O</h1>
      </header>
      <ClustersPage loadGatewayConfig={loadGatewayConfig} getCluster={getCluster} />
    </QueryClientProvider>
  );
}
