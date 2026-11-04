import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Link, Route, Routes } from "react-router";
import type { LoadGatewayConfig } from "./config/loadGatewayConfig";
import type { GetCluster } from "./gateway/getCluster";
import type { GetTopicDetail } from "./gateway/getTopicDetail";
import type { ListLatestTopicMessages } from "./gateway/listLatestTopicMessages";
import type { ListTopics } from "./gateway/listTopics";
import type { SearchTopicMessages } from "./gateway/searchTopicMessages";
import { ClusterPage } from "./pages/ClusterPage";
import { ClustersPage } from "./pages/ClustersPage";
import { TopicPage } from "./pages/TopicPage";

type AppProps = {
  queryClient: QueryClient;
  loadGatewayConfig: LoadGatewayConfig;
  getCluster: GetCluster;
  listTopics: ListTopics;
  getTopicDetail: GetTopicDetail;
  listLatestTopicMessages: ListLatestTopicMessages;
  searchTopicMessages: SearchTopicMessages;
  statusRefreshMs: number;
};

export function App({
  queryClient,
  loadGatewayConfig,
  getCluster,
  listTopics,
  getTopicDetail,
  listLatestTopicMessages,
  searchTopicMessages,
  statusRefreshMs,
}: AppProps) {
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
              listTopics={listTopics}
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
        <Route
          path="/clusters/:gatewayId/topics/:topicName"
          element={
            <TopicPage
              loadGatewayConfig={loadGatewayConfig}
              getTopicDetail={getTopicDetail}
              listLatestTopicMessages={listLatestTopicMessages}
              searchTopicMessages={searchTopicMessages}
            />
          }
        />
        <Route
          path="/clusters/:gatewayId/topics/:topicName/messages"
          element={
            <TopicPage
              loadGatewayConfig={loadGatewayConfig}
              getTopicDetail={getTopicDetail}
              listLatestTopicMessages={listLatestTopicMessages}
              searchTopicMessages={searchTopicMessages}
              view="messages"
            />
          }
        />
      </Routes>
    </QueryClientProvider>
  );
}
