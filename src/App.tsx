import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { Route, Routes } from "react-router";
import { AppShell } from "./components/AppShell";
import type { LoadGatewayConfig } from "./config/loadGatewayConfig";
import type { KafkaAdministration } from "./gateway/administration";
import type { GetCluster } from "./gateway/getCluster";
import type { GetTopicDetail } from "./gateway/getTopicDetail";
import type { CreateTopic } from "./gateway/createTopic";
import type { ConfirmTopicDeletion, DeleteTopic } from "./gateway/deleteTopic";
import type { GatewayCredentials } from "./gateway/GatewayCredentials";
import type { ListConsumerGroups } from "./gateway/listConsumerGroups";
import type { ListLatestTopicMessages } from "./gateway/listLatestTopicMessages";
import type { ListTopics } from "./gateway/listTopics";
import type { ProduceTopicMessage } from "./gateway/produceTopicMessage";
import type { SearchTopicMessages } from "./gateway/searchTopicMessages";
import { ClusterPage } from "./pages/ClusterPage";
import { BrokerConfigurationPage } from "./pages/BrokerConfigurationPage";
import { ClustersPage } from "./pages/ClustersPage";
import { TopicPage } from "./pages/TopicPage";
import { TopicAdministrationPage } from "./pages/TopicAdministrationPage";

type AppProps = {
  queryClient: QueryClient;
  loadGatewayConfig: LoadGatewayConfig;
  gatewayCredentials: GatewayCredentials;
  administration: KafkaAdministration;
  getCluster: GetCluster;
  listTopics: ListTopics;
  listConsumerGroups: ListConsumerGroups;
  getTopicDetail: GetTopicDetail;
  listLatestTopicMessages: ListLatestTopicMessages;
  searchTopicMessages: SearchTopicMessages;
  produceTopicMessage: ProduceTopicMessage;
  createTopic: CreateTopic;
  deleteTopic: DeleteTopic;
  confirmTopicDeletion: ConfirmTopicDeletion;
  linkOrigin: string;
  copyMessageLink: (text: string) => Promise<void>;
  statusRefreshMs: number;
  sessionIndicator?: ReactNode;
};

export function App({
  queryClient,
  loadGatewayConfig,
  gatewayCredentials,
  administration,
  getCluster,
  listTopics,
  listConsumerGroups,
  getTopicDetail,
  listLatestTopicMessages,
  searchTopicMessages,
  produceTopicMessage,
  createTopic,
  deleteTopic,
  confirmTopicDeletion,
  linkOrigin,
  copyMessageLink,
  statusRefreshMs,
  sessionIndicator,
}: AppProps) {
  const [connectionPanel, setConnectionPanel] = useState<{ gatewayId?: string } | null>(null);

  return (
    <QueryClientProvider client={queryClient}>
      <AppShell
        loadGatewayConfig={loadGatewayConfig}
        credentials={gatewayCredentials}
        connectionOpen={connectionPanel !== null}
        selectedGatewayId={connectionPanel?.gatewayId}
        onOpenConnection={() => setConnectionPanel({})}
        onOpenGatewayConnection={(gatewayId) => setConnectionPanel({ gatewayId })}
        onCloseConnection={() => setConnectionPanel(null)}
        sessionIndicator={sessionIndicator}
      >
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
                listConsumerGroups={listConsumerGroups}
                createTopic={createTopic}
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
                listConsumerGroups={listConsumerGroups}
                createTopic={createTopic}
                statusRefreshMs={statusRefreshMs}
                view="topics"
              />
            }
          />
          <Route
            path="/clusters/:gatewayId/consumer-groups"
            element={
              <ClusterPage
                loadGatewayConfig={loadGatewayConfig}
                getCluster={getCluster}
                listTopics={listTopics}
                listConsumerGroups={listConsumerGroups}
                createTopic={createTopic}
                statusRefreshMs={statusRefreshMs}
                view="consumer-groups"
              />
            }
          />
          <Route
            path="/clusters/:gatewayId/configuration"
            element={<BrokerConfigurationPage loadGatewayConfig={loadGatewayConfig} getCluster={getCluster} administration={administration} statusRefreshMs={statusRefreshMs} />}
          />
          <Route
            path="/clusters/:gatewayId/topics/:topicName"
            element={
              <TopicPage
                loadGatewayConfig={loadGatewayConfig}
                getTopicDetail={getTopicDetail}
                listConsumerGroups={listConsumerGroups}
                listLatestTopicMessages={listLatestTopicMessages}
                searchTopicMessages={searchTopicMessages}
                produceTopicMessage={produceTopicMessage}
                deleteTopic={deleteTopic}
                confirmTopicDeletion={confirmTopicDeletion}
                linkOrigin={linkOrigin}
                copyMessageLink={copyMessageLink}
              />
            }
          />
          <Route
            path="/clusters/:gatewayId/topics/:topicName/messages"
            element={
              <TopicPage
                loadGatewayConfig={loadGatewayConfig}
                getTopicDetail={getTopicDetail}
                listConsumerGroups={listConsumerGroups}
                listLatestTopicMessages={listLatestTopicMessages}
                searchTopicMessages={searchTopicMessages}
                produceTopicMessage={produceTopicMessage}
                deleteTopic={deleteTopic}
                confirmTopicDeletion={confirmTopicDeletion}
                linkOrigin={linkOrigin}
                copyMessageLink={copyMessageLink}
                view="messages"
              />
            }
          />
          <Route
            path="/clusters/:gatewayId/topics/:topicName/consumers"
            element={
              <TopicPage
                loadGatewayConfig={loadGatewayConfig}
                getTopicDetail={getTopicDetail}
                listConsumerGroups={listConsumerGroups}
                listLatestTopicMessages={listLatestTopicMessages}
                searchTopicMessages={searchTopicMessages}
                produceTopicMessage={produceTopicMessage}
                deleteTopic={deleteTopic}
                confirmTopicDeletion={confirmTopicDeletion}
                linkOrigin={linkOrigin}
                copyMessageLink={copyMessageLink}
                view="consumers"
              />
            }
          />
          <Route
            path="/clusters/:gatewayId/topics/:topicName/configuration"
            element={<TopicAdministrationPage loadGatewayConfig={loadGatewayConfig} getCluster={getCluster} getTopicDetail={getTopicDetail} administration={administration} statusRefreshMs={statusRefreshMs} />}
          />
        </Routes>
      </AppShell>
    </QueryClientProvider>
  );
}
