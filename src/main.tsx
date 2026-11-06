import { QueryClient } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import "./styles.css";
import { App } from "./App";
import { loadGatewayConfig } from "./config/loadGatewayConfig";
import { alterConfiguration } from "./gateway/alterConfiguration";
import { clearGatewayToken } from "./gateway/clearGatewayToken";
import { createTopic } from "./gateway/createTopic";
import { deleteTopic } from "./gateway/deleteTopic";
import { fetchGatewayJson } from "./gateway/fetchGatewayJson";
import { fetchJson } from "./gateway/fetchJson";
import { getGatewayToken } from "./gateway/getGatewayToken";
import { getCluster } from "./gateway/getCluster";
import { getConfigurations } from "./gateway/getConfigurations";
import { getTopicDetail } from "./gateway/getTopicDetail";
import { isLocalManualGatewayUrl } from "./gateway/isLocalManualGatewayUrl";
import { increasePartitions } from "./gateway/increasePartitions";
import { listConsumerGroups } from "./gateway/listConsumerGroups";
import { listLatestTopicMessages } from "./gateway/listLatestTopicMessages";
import { listTopics } from "./gateway/listTopics";
import { listReassignments } from "./gateway/listReassignments";
import { produceTopicMessage } from "./gateway/produceTopicMessage";
import { reassignPartition } from "./gateway/reassignPartition";
import type { GatewayWriteRequest } from "./gateway/GatewayWriteRequest";
import { searchTopicMessages } from "./gateway/searchTopicMessages";
import { setGatewayToken } from "./gateway/setGatewayToken";

const gatewayTimeoutMs = 5000;
const statusRefreshMs = 15_000;
const manualProxyOrigin = import.meta.env.VITE_KAFKA3O_MANUAL_PROXY === "true" ? window.location.origin : undefined;
const boundFetchJson = (url: string) => fetchJson(window.fetch.bind(window), url, gatewayTimeoutMs);
const gatewayCredentials = {
  read: (gatewayUrl: string) => getGatewayToken(window.sessionStorage, gatewayUrl),
  save: (gatewayUrl: string, token: string) => setGatewayToken(window.sessionStorage, gatewayUrl, token, window.isSecureContext),
  clear: (gatewayUrl: string) => clearGatewayToken(window.sessionStorage, gatewayUrl),
  isAutomatic: (gatewayUrl: string) => isLocalManualGatewayUrl(gatewayUrl, manualProxyOrigin),
};
const gatewayFetchJson = (gatewayUrl: string) => (url: string) =>
  fetchGatewayJson(window.fetch.bind(window), gatewayUrl, url, gatewayTimeoutMs, gatewayCredentials.read, window.isSecureContext, undefined, manualProxyOrigin);
const gatewayFetchWrite = (gatewayUrl: string) => (url: string, request: GatewayWriteRequest) =>
  fetchGatewayJson(window.fetch.bind(window), gatewayUrl, url, gatewayTimeoutMs, gatewayCredentials.read, window.isSecureContext, request, manualProxyOrigin);
const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App
        queryClient={queryClient}
        loadGatewayConfig={() => loadGatewayConfig(boundFetchJson)}
        gatewayCredentials={gatewayCredentials}
        administration={{
          getConfigurations: (gatewayUrl, resource) => getConfigurations(gatewayFetchJson(gatewayUrl), gatewayUrl, resource),
          alterConfiguration: (gatewayUrl, resource, change) => alterConfiguration(gatewayFetchWrite(gatewayUrl), gatewayUrl, resource, change),
          increasePartitions: (gatewayUrl, topic, count) => increasePartitions(gatewayFetchWrite(gatewayUrl), gatewayUrl, topic, count),
          listReassignments: (gatewayUrl, topic) => listReassignments(gatewayFetchJson(gatewayUrl), gatewayUrl, topic),
          reassignPartition: (gatewayUrl, topic, partition, replicas) => reassignPartition(gatewayFetchWrite(gatewayUrl), gatewayUrl, topic, partition, replicas),
          confirmChange: (message) => window.confirm(message),
        }}
        getCluster={(gatewayUrl) => getCluster(gatewayFetchJson(gatewayUrl), gatewayUrl)}
        listTopics={(gatewayUrl) => listTopics(gatewayFetchJson(gatewayUrl), gatewayUrl)}
        listConsumerGroups={(gatewayUrl) => listConsumerGroups(gatewayFetchJson(gatewayUrl), gatewayUrl)}
        getTopicDetail={(gatewayUrl, topicName) => getTopicDetail(gatewayFetchJson(gatewayUrl), gatewayUrl, topicName)}
        listLatestTopicMessages={(gatewayUrl, topicName, position) =>
          listLatestTopicMessages(gatewayFetchJson(gatewayUrl), gatewayUrl, topicName, position)
        }
        searchTopicMessages={(gatewayUrl, topicName, query) => searchTopicMessages(gatewayFetchJson(gatewayUrl), gatewayUrl, topicName, query)}
        produceTopicMessage={(gatewayUrl, topicName, message) => produceTopicMessage(gatewayFetchWrite(gatewayUrl), gatewayUrl, topicName, message)}
        createTopic={(gatewayUrl, input) => createTopic(gatewayFetchWrite(gatewayUrl), gatewayUrl, input)}
        deleteTopic={(gatewayUrl, topicName) => deleteTopic(gatewayFetchWrite(gatewayUrl), gatewayUrl, topicName)}
        confirmTopicDeletion={(topicName) => window.confirm(`Delete topic "${topicName}"? Its messages may be permanently deleted.`)}
        linkOrigin={window.location.origin}
        copyMessageLink={(text) => navigator.clipboard.writeText(text)}
        statusRefreshMs={statusRefreshMs}
      />
    </BrowserRouter>
  </StrictMode>,
);
