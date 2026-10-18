import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { LoadGatewayConfig } from "./config/loadGatewayConfig";
import { ClustersPage } from "./pages/ClustersPage";

type AppProps = {
  queryClient: QueryClient;
  loadGatewayConfig: LoadGatewayConfig;
};

export function App({ queryClient, loadGatewayConfig }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <header>
        <h1>Kafka3O</h1>
      </header>
      <ClustersPage loadGatewayConfig={loadGatewayConfig} />
    </QueryClientProvider>
  );
}
