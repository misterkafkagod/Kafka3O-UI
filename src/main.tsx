import { QueryClient } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import "./styles.css";
import { App } from "./App";
import { ConsoleSessionGate } from "./components/ConsoleSessionGate";
import { loadGatewayConfig } from "./config/loadGatewayConfig";
import type { ConsoleAdminClient, ConsoleAdminTransport } from "./console/ConsoleAdmin";
import type { ConsoleSessionClient, ConsoleSessionTransport } from "./console/ConsoleSession";
import type { ConsoleBrowser, ConsoleSsoClient, ConsoleSsoTransport } from "./console/ConsoleSso";
import { changeGroupMapping } from "./console/changeGroupMapping";
import { changeLocalPassword } from "./console/changeLocalPassword";
import { changeRoleGrant } from "./console/changeRoleGrant";
import { classifyCluster } from "./console/classifyCluster";
import { completeCognitoSignIn } from "./console/completeCognitoSignIn";
import { listAccess } from "./console/listAccess";
import { listClusters } from "./console/listClusters";
import { readCognitoAvailability } from "./console/readCognitoAvailability";
import { readConsoleSession } from "./console/readConsoleSession";
import { requestConsoleAdmin } from "./console/requestConsoleAdmin";
import { requestConsoleSession } from "./console/requestConsoleSession";
import { requestConsoleSso } from "./console/requestConsoleSso";
import { signInLocal } from "./console/signInLocal";
import { signOutConsole } from "./console/signOutConsole";
import { signOutConsoleSso } from "./console/signOutConsoleSso";
import { startCognitoSignIn } from "./console/startCognitoSignIn";
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
const consolePreview = import.meta.env.VITE_KAFKA3O_CONSOLE_AUTH_PREVIEW === "true";
const consoleTransport: ConsoleSessionTransport = (operation, signal) =>
  requestConsoleSession(window.fetch.bind(window), window.location.origin, () => document.cookie, 15_000, operation, signal);
const consoleSession: ConsoleSessionClient = {
  inspect: (signal) => readConsoleSession(consoleTransport, signal),
  signIn: (username, password) => signInLocal(consoleTransport, username, password),
  changePassword: (current, replacement) => changeLocalPassword(consoleTransport, current, replacement),
  signOut: () => signOutConsole(consoleTransport),
};
const adminTransport: ConsoleAdminTransport = (operation) =>
  requestConsoleAdmin(window.fetch.bind(window), window.location.origin, () => document.cookie, 15_000, operation);
const consoleAdmin: ConsoleAdminClient = {
  listAccess: (after) => listAccess(adminTransport, after),
  changeRoleGrant: (identityId, clusterId, expected, role) => changeRoleGrant(adminTransport, identityId, clusterId, expected, role),
  changeGroupMapping: (issuer, group, clusterId, expected, role) => changeGroupMapping(adminTransport, issuer, group, clusterId, expected, role),
  listClusters: () => listClusters(adminTransport),
  classifyCluster: (clusterId, expected, environment, reason) => classifyCluster(adminTransport, clusterId, expected, environment, reason),
};
const ssoTransport: ConsoleSsoTransport = (request) =>
  requestConsoleSso(window.fetch.bind(window), window.location.origin, () => document.cookie, request);
const browserLocks = typeof navigator === "undefined" ? undefined : navigator.locks;
const consoleSso: ConsoleSsoClient = {
  available: () => readCognitoAvailability(ssoTransport, browserLocks),
  start: () => startCognitoSignIn(ssoTransport, browserLocks),
  complete: (query) => completeCognitoSignIn(ssoTransport, browserLocks, query),
  signOut: () => signOutConsoleSso(ssoTransport, browserLocks),
};
const consoleBrowser: ConsoleBrowser = {
  path: window.location.pathname,
  query: window.location.search,
  replace: (path) => window.history.replaceState(null, "", path),
  assign: (url) => window.location.assign(url),
};const manualProxyOrigin = import.meta.env.VITE_KAFKA3O_MANUAL_PROXY === "true" ? window.location.origin : undefined;
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
    {consolePreview ? <ConsoleSessionGate client={consoleSession} sso={consoleSso} browser={consoleBrowser}
      admin={consoleAdmin} confirm={(message) => window.confirm(message)} /> : <BrowserRouter>
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
    </BrowserRouter>}
  </StrictMode>,
);
