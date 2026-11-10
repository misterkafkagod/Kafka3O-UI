import { QueryClient } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import "./styles.css";
import "./appearance/themes.css";
import "./appearance/typography.css";
import type { AppearanceStorage } from "./appearance/Appearance";
import { AppearanceContext } from "./appearance/AppearanceContext";
import { createAppearanceStore } from "./appearance/createAppearanceStore";
import { App } from "./App";
import { ConsoleSessionGate, type SecuredAppChrome } from "./components/ConsoleSessionGate";
import { loadGatewayConfig } from "./config/loadGatewayConfig";
import type { ConsoleAdminClient, ConsoleAdminTransport } from "./console/ConsoleAdmin";
import type { ConsoleAuditClient } from "./console/ConsoleAudit";
import { buildAuditQuery } from "./console/buildAuditQuery";
import { listAuditEvents } from "./console/listAuditEvents";
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
import { fetchConsoleGatewayJson } from "./console/fetchConsoleGatewayJson";
import { loadAuthorizedClusters } from "./console/loadAuthorizedClusters";
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
import { applyOffsetReset } from "./gateway/applyOffsetReset";
import { previewOffsetReset } from "./gateway/previewOffsetReset";
import { listLatestTopicMessages } from "./gateway/listLatestTopicMessages";
import { listTopics } from "./gateway/listTopics";
import { listReassignments } from "./gateway/listReassignments";
import { produceTopicMessage } from "./gateway/produceTopicMessage";
import { reassignPartition } from "./gateway/reassignPartition";
import type { GatewayWriteRequest } from "./gateway/GatewayWriteRequest";
import type { GatewayEntry } from "./gateway/types";
import { searchTopicMessages } from "./gateway/searchTopicMessages";
import { setGatewayToken } from "./gateway/setGatewayToken";

const gatewayTimeoutMs = 5000;
const securedTimeoutMs = 8000;
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
const consoleAudit: ConsoleAuditClient = {
  list: (filters, after) => listAuditEvents(adminTransport, filters, after),
  exportUrl: (filters) => `/api/audit/export?${buildAuditQuery(filters)}`,
  scopes: () => loadAuthorizedClusters(window.fetch.bind(window), window.location.origin, () => undefined),
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
};
const manualProxyOrigin = import.meta.env.VITE_KAFKA3O_MANUAL_PROXY === "true" ? window.location.origin : undefined;
const boundFetchJson = (url: string) => fetchJson(window.fetch.bind(window), url, gatewayTimeoutMs);
const gatewayCredentials = {
  read: (gatewayUrl: string) => getGatewayToken(window.sessionStorage, gatewayUrl),
  save: (gatewayUrl: string, token: string) => setGatewayToken(window.sessionStorage, gatewayUrl, token, window.isSecureContext),
  clear: (gatewayUrl: string) => clearGatewayToken(window.sessionStorage, gatewayUrl),
  isAutomatic: (gatewayUrl: string) => isLocalManualGatewayUrl(gatewayUrl, manualProxyOrigin),
};
type GatewayRead = (gatewayUrl: string) => (url: string) => Promise<unknown>;
type GatewayWrite = (gatewayUrl: string) => (url: string, request: GatewayWriteRequest) => Promise<unknown>;
type GatewayAppCredentials = typeof gatewayCredentials;

// gatewayApp is composition-root wiring of the Kafka UI over a chosen Gateway transport.
function gatewayApp(read: GatewayRead, write: GatewayWrite, credentials: GatewayAppCredentials, loadConfig: () => Promise<GatewayEntry[]>,
  chrome?: SecuredAppChrome) {
  return (
    <BrowserRouter>
      <App
        queryClient={queryClient}
        loadGatewayConfig={loadConfig}
        gatewayCredentials={credentials}
        administration={{
          getConfigurations: (gatewayUrl, resource) => getConfigurations(read(gatewayUrl), gatewayUrl, resource),
          alterConfiguration: (gatewayUrl, resource, change) => alterConfiguration(write(gatewayUrl), gatewayUrl, resource, change),
          increasePartitions: (gatewayUrl, topic, count) => increasePartitions(write(gatewayUrl), gatewayUrl, topic, count),
          listReassignments: (gatewayUrl, topic) => listReassignments(read(gatewayUrl), gatewayUrl, topic),
          reassignPartition: (gatewayUrl, topic, partition, replicas) => reassignPartition(write(gatewayUrl), gatewayUrl, topic, partition, replicas),
          confirmChange: (message) => window.confirm(message),
        }}
        getCluster={(gatewayUrl) => getCluster(read(gatewayUrl), gatewayUrl)}
        listTopics={(gatewayUrl) => listTopics(read(gatewayUrl), gatewayUrl)}
        listConsumerGroups={(gatewayUrl) => listConsumerGroups(read(gatewayUrl), gatewayUrl)}
        offsetReset={{
          preview: (gatewayUrl, group, topic, target) => previewOffsetReset(read(gatewayUrl), gatewayUrl, group, topic, target),
          apply: (gatewayUrl, preview) => applyOffsetReset(write(gatewayUrl), gatewayUrl, preview),
          confirm: (message) => window.confirm(message),
        }}
        getTopicDetail={(gatewayUrl, topicName) => getTopicDetail(read(gatewayUrl), gatewayUrl, topicName)}
        listLatestTopicMessages={(gatewayUrl, topicName, position) =>
          listLatestTopicMessages(read(gatewayUrl), gatewayUrl, topicName, position)
        }
        searchTopicMessages={(gatewayUrl, topicName, query) => searchTopicMessages(read(gatewayUrl), gatewayUrl, topicName, query)}
        produceTopicMessage={(gatewayUrl, topicName, message) => produceTopicMessage(write(gatewayUrl), gatewayUrl, topicName, message)}
        createTopic={(gatewayUrl, input) => createTopic(write(gatewayUrl), gatewayUrl, input)}
        deleteTopic={(gatewayUrl, topicName) => deleteTopic(write(gatewayUrl), gatewayUrl, topicName)}
        confirmTopicDeletion={(topicName) => window.confirm(`Delete topic "${topicName}"? Its messages may be permanently deleted.`)}
        linkOrigin={window.location.origin}
        copyMessageLink={(text) => navigator.clipboard.writeText(text)}
        statusRefreshMs={statusRefreshMs}
        sessionIndicator={chrome?.sessionIndicator}
        administrationLink={chrome?.administrationLink}
        administrationPage={chrome?.administrationPage}
        credentialsControl={chrome === undefined}
      />
    </BrowserRouter>
  );
}

const legacyRead: GatewayRead = (gatewayUrl) => (url) =>
  fetchGatewayJson(window.fetch.bind(window), gatewayUrl, url, gatewayTimeoutMs, gatewayCredentials.read, window.isSecureContext, undefined, manualProxyOrigin);
const legacyWrite: GatewayWrite = (gatewayUrl) => (url, request) =>
  fetchGatewayJson(window.fetch.bind(window), gatewayUrl, url, gatewayTimeoutMs, gatewayCredentials.read, window.isSecureContext, request, manualProxyOrigin);
const queryClient = new QueryClient();

// Secured mode sends every Kafka request through the Console; there are no Gateway tokens to enter.
const consoleSecured = import.meta.env.VITE_KAFKA3O_CONSOLE_SECURED === "true";
const securedCredentials: GatewayAppCredentials = { read: () => null, save: () => undefined, clear: () => undefined, isAutomatic: () => true };
function securedApp(sessionEnded: () => void, chrome: SecuredAppChrome) {
  const ended = () => {
    queryClient.clear();
    sessionEnded();
  };
  const origin = window.location.origin;
  const clusters = new Map<string, GatewayEntry>();
  const loadClusters = async () => {
    const entries = await loadAuthorizedClusters(window.fetch.bind(window), origin, ended);
    clusters.clear();
    for (const entry of entries) clusters.set(entry.url, entry);
    return entries;
  };
  const productionReason = (gatewayUrl: string) => {
    const cluster = clusters.get(gatewayUrl);
    return cluster?.environment === "PRODUCTION"
      ? () => window.prompt(`Production change on ${cluster.name} (${cluster.id}). Enter the change reason; cancel to send nothing.`)
      : undefined;
  };
  const read: GatewayRead = (gatewayUrl) => (url) =>
    fetchConsoleGatewayJson(window.fetch.bind(window), origin, () => document.cookie, gatewayUrl, url, securedTimeoutMs, ended);
  const write: GatewayWrite = (gatewayUrl) => (url, request) =>
    fetchConsoleGatewayJson(window.fetch.bind(window), origin, () => document.cookie, gatewayUrl, url, securedTimeoutMs, ended, request,
      productionReason(gatewayUrl));
  return gatewayApp(read, write, securedCredentials, loadClusters, chrome);
}

// The saved appearance is applied before the first render, so the page never flashes the default theme.
let appearanceStorage: AppearanceStorage | null = null;
try {
  appearanceStorage = window.localStorage;
} catch {
  appearanceStorage = null;
}
const appearanceStore = createAppearanceStore(appearanceStorage, document.documentElement, window);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppearanceContext.Provider value={appearanceStore}>
    {consoleSecured ? (
      <ConsoleSessionGate client={consoleSession} sso={consoleSso} browser={consoleBrowser}
        admin={consoleAdmin} confirm={(message) => window.confirm(message)} renderApp={securedApp} audit={consoleAudit} />
    ) : consolePreview ? (
      <ConsoleSessionGate client={consoleSession} sso={consoleSso} browser={consoleBrowser}
        admin={consoleAdmin} confirm={(message) => window.confirm(message)} audit={consoleAudit} />
    ) : gatewayApp(legacyRead, legacyWrite, gatewayCredentials, () => loadGatewayConfig(boundFetchJson))}
    </AppearanceContext.Provider>
  </StrictMode>,
);
