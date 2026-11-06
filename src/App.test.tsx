import { QueryClient } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useNavigate } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App";
import type { GetCluster } from "./gateway/getCluster";
import { HttpError } from "./gateway/HttpError";
import type { GatewayEntry } from "./gateway/types";

const pendingGetCluster = () => new Promise<never>(() => {});
const pendingListTopics = () => new Promise<never>(() => {});
const pendingListConsumerGroups = () => new Promise<never>(() => {});
const pendingGetTopicDetail = () => new Promise<never>(() => {});
const pendingListLatestTopicMessages = () => new Promise<never>(() => {});
const pendingSearchTopicMessages = () => new Promise<never>(() => {});
const produceTopicMessage = async () => ({ partition: 0, offset: "0" });
const createTopic = async () => {};
const deleteTopic = async () => {};
const confirmTopicDeletion = () => false;
const linkOrigin = "https://console.example";
const copyMessageLink = async () => {};
const gatewayCredentials = { read: () => null, save: () => {}, clear: () => {} };

function renderApp(initialEntry = "/", gateways: GatewayEntry[] = [], getCluster: GetCluster = pendingGetCluster) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <App
        queryClient={new QueryClient()}
        gatewayCredentials={gatewayCredentials}
        produceTopicMessage={produceTopicMessage}
        createTopic={createTopic}
        deleteTopic={deleteTopic}
        confirmTopicDeletion={confirmTopicDeletion}
        loadGatewayConfig={async () => gateways}
        getCluster={getCluster}
        listTopics={pendingListTopics}
        listConsumerGroups={pendingListConsumerGroups}
        getTopicDetail={pendingGetTopicDetail}
        listLatestTopicMessages={pendingListLatestTopicMessages}
        searchTopicMessages={pendingSearchTopicMessages}
        linkOrigin={linkOrigin}
        copyMessageLink={copyMessageLink}
        statusRefreshMs={60_000}
      />
    </MemoryRouter>,
  );
}

function HistoryControls() {
  const navigate = useNavigate();
  return (
    <>
      <button type="button" onClick={() => navigate(-1)}>Go back</button>
      <button type="button" onClick={() => navigate(1)}>Go forward</button>
    </>
  );
}

describe("App", () => {
  it("opens the selected gateway's credentials from its authentication card", async () => {
    const user = userEvent.setup();
    const dev = { id: "dev", name: "Dev", url: "https://dev.example" };
    const prod = { id: "prod", name: "Prod", url: "https://prod.example" };
    renderApp("/", [dev, prod], async (url) => {
      if (url === prod.url) throw new HttpError(401, "unauthorized");
      return { clusterId: "dev-cluster", controllerId: 1, brokers: [] };
    });

    const prodCard = await screen.findByRole("article", { name: "Prod" });
    const action = await within(prodCard).findByRole("button", { name: "Manage credentials for Prod" });
    expect(await within(screen.getByRole("article", { name: "Dev" })).findByText("Healthy")).toBeDefined();
    await user.click(action);
    const dialog = screen.getByRole("dialog", { name: "Gateway credentials" });
    expect(within(dialog).getByText("Prod", { selector: "strong" })).toBeDefined();
    expect(document.activeElement).toBe(within(dialog).getByLabelText("Token for Prod"));
    await user.keyboard("{Escape}");
    expect(document.activeElement).toBe(action);
  });

  it("offers a keyboard skip link to the page content", async () => {
    const user = userEvent.setup();
    renderApp();

    const skip = screen.getByRole("link", { name: "Skip to main content" });
    expect(skip.getAttribute("href")).toBe("#main-content");
    expect(document.getElementById("main-content")?.getAttribute("tabindex")).toBe("-1");
    await user.tab();
    expect(document.activeElement).toBe(skip);
  });

  it("renders the Kafka3O header", () => {
    renderApp();

    expect(screen.getByRole("heading", { name: "Kafka3O" })).toBeDefined();
  });

  it("header links to /", () => {
    renderApp();

    expect(screen.getByRole("link", { name: "Kafka3O" }).getAttribute("href")).toBe("/");
    const primaryNavigation = screen.getByRole("navigation", { name: "Primary navigation" });
    expect(within(primaryNavigation).getByRole("link", { name: "Clusters" }).getAttribute("aria-current")).toBe("page");
  });

  it("shows active cluster navigation and breadcrumbs on cluster pages", async () => {
    renderApp("/clusters/dev/topics", [{ id: "dev", name: "Dev", url: "http://localhost:8081" }]);

    expect(await screen.findByRole("navigation", { name: "Breadcrumb" })).toBeDefined();
    const primaryNavigation = screen.getByRole("navigation", { name: "Primary navigation" });
    expect(within(primaryNavigation).getByRole("link", { name: "Clusters" }).getAttribute("aria-current")).toBe(
      "location",
    );
    const breadcrumb = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect((await within(breadcrumb).findByRole("link", { name: "Dev" })).getAttribute("href")).toBe("/clusters/dev");
    expect(within(breadcrumb).getByText("Topics").getAttribute("aria-current")).toBe("page");
    const clusterSections = screen.getByRole("navigation", { name: "Cluster sections" });
    expect(within(clusterSections).getByRole("link", { name: "Topics" }).getAttribute("aria-current")).toBe("page");
  });

  it("shows decoded topic context and correct breadcrumb destinations", async () => {
    renderApp("/clusters/dev/topics/orders%20%26%20audit/messages", [
      { id: "dev", name: "Dev", url: "http://localhost:8081" },
    ]);

    const breadcrumb = await screen.findByRole("navigation", { name: "Breadcrumb" });
    expect(within(breadcrumb).getByRole("link", { name: "Clusters" }).getAttribute("href")).toBe("/");
    expect((await within(breadcrumb).findByRole("link", { name: "Dev" })).getAttribute("href")).toBe("/clusters/dev");
    expect(within(breadcrumb).getByRole("link", { name: "Topics" }).getAttribute("href")).toBe("/clusters/dev/topics");
    expect(within(breadcrumb).getByText("orders & audit").getAttribute("aria-current")).toBe("page");
    expect(within(screen.getByRole("navigation", { name: "Topic views" })).getByRole("link", { name: "Messages" }).getAttribute("aria-current")).toBe("page");
  });

  it("clicking the Dev card opens its cluster page", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <App
          queryClient={new QueryClient()}
          gatewayCredentials={gatewayCredentials}
          produceTopicMessage={produceTopicMessage}
          createTopic={createTopic}
          deleteTopic={deleteTopic}
          confirmTopicDeletion={confirmTopicDeletion}
          loadGatewayConfig={async () => [{ id: "dev", name: "Dev", url: "http://localhost:8081" }]}
          getCluster={async () => ({ clusterId: "abc", controllerId: 1, brokers: [{ id: 1, host: "kafka-dev", port: 9092 }] })}
          listTopics={async () => [{ name: "orders", partitions: 6, replicationFactor: 1, internal: false, approxMessages: 10 }]}
          listConsumerGroups={pendingListConsumerGroups}
          getTopicDetail={pendingGetTopicDetail}
          listLatestTopicMessages={pendingListLatestTopicMessages}
          searchTopicMessages={pendingSearchTopicMessages}
          linkOrigin={linkOrigin}
          copyMessageLink={copyMessageLink}
          statusRefreshMs={60_000}
        />
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole("link", { name: "Dev" }));

    expect(await screen.findByText("Controller: 1")).toBeDefined();
    expect(screen.getByRole("table", { name: "Brokers" })).toBeDefined();
  });

  it("the Topics tab opens the cluster's topic list", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/clusters/dev"]}>
        <App
          queryClient={new QueryClient()}
          gatewayCredentials={gatewayCredentials}
          produceTopicMessage={produceTopicMessage}
          createTopic={createTopic}
          deleteTopic={deleteTopic}
          confirmTopicDeletion={confirmTopicDeletion}
          loadGatewayConfig={async () => [{ id: "dev", name: "Dev", url: "http://localhost:8081" }]}
          getCluster={pendingGetCluster}
          listTopics={async () => [{ name: "orders", partitions: 6, replicationFactor: 1, internal: false, approxMessages: 10 }]}
          listConsumerGroups={pendingListConsumerGroups}
          getTopicDetail={pendingGetTopicDetail}
          listLatestTopicMessages={pendingListLatestTopicMessages}
          searchTopicMessages={pendingSearchTopicMessages}
          linkOrigin={linkOrigin}
          copyMessageLink={copyMessageLink}
          statusRefreshMs={60_000}
        />
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole("link", { name: "Topics" }));

    expect(screen.getByRole("main")).toBeDefined();
    expect(screen.getByRole("heading", { name: "Topics", level: 2 })).toBeDefined();
    expect(await screen.findByRole("table", { name: "Topics" })).toBeDefined();
    expect(screen.getByText("orders")).toBeDefined();
  });

  it("opens consumer groups with the injected gateway client", async () => {
    const user = userEvent.setup();
    const listGroups = vi.fn(async () => [
      { id: "orders-group", protocol: "classic" as const, state: "Empty", members: [], topics: [], partitions: [] },
    ]);
    render(
      <MemoryRouter initialEntries={["/clusters/dev"]}>
        <App
          queryClient={new QueryClient()}
          gatewayCredentials={gatewayCredentials}
          produceTopicMessage={produceTopicMessage}
          createTopic={createTopic}
          deleteTopic={deleteTopic}
          confirmTopicDeletion={confirmTopicDeletion}
          loadGatewayConfig={async () => [{ id: "dev", name: "Dev", url: "http://localhost:8081" }]}
          getCluster={pendingGetCluster}
          listTopics={pendingListTopics}
          listConsumerGroups={listGroups}
          getTopicDetail={pendingGetTopicDetail}
          listLatestTopicMessages={pendingListLatestTopicMessages}
          searchTopicMessages={pendingSearchTopicMessages}
          linkOrigin={linkOrigin}
          copyMessageLink={copyMessageLink}
          statusRefreshMs={60_000}
        />
      </MemoryRouter>,
    );
    await user.click(await screen.findByRole("link", { name: "Consumer groups" }));
    expect(await screen.findByRole("heading", { name: "orders-group" })).toBeDefined();
    expect(listGroups).toHaveBeenCalledWith("http://localhost:8081");
  });

  it("clicking a topic opens its detail page", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/clusters/dev/topics"]}>
        <App
          queryClient={new QueryClient()}
          gatewayCredentials={gatewayCredentials}
          produceTopicMessage={produceTopicMessage}
          createTopic={createTopic}
          deleteTopic={deleteTopic}
          confirmTopicDeletion={confirmTopicDeletion}
          loadGatewayConfig={async () => [{ id: "dev", name: "Dev", url: "http://localhost:8081" }]}
          getCluster={pendingGetCluster}
          listTopics={async () => [{ name: "orders", partitions: 1, replicationFactor: 1, internal: false, approxMessages: 1 }]}
          listConsumerGroups={pendingListConsumerGroups}
          getTopicDetail={async () => ({
            name: "orders",
            partitions: [{ id: 0, leader: 1, replicas: [1], isr: [1], startOffset: 0, endOffset: 1 }],
            config: [],
          })}
          listLatestTopicMessages={async () => []}
          searchTopicMessages={pendingSearchTopicMessages}
          linkOrigin={linkOrigin}
          copyMessageLink={copyMessageLink}
          statusRefreshMs={60_000}
        />
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole("link", { name: "orders" }));

    expect(await screen.findByRole("table", { name: "Topic partitions" })).toBeDefined();
    await user.click(screen.getByRole("link", { name: "Messages" }));
    expect(await screen.findByText("No messages found.")).toBeDefined();
  });

  it("opens Consumers for an encoded topic and its configured gateway", async () => {
    const user = userEvent.setup();
    const listGroups = vi.fn(async () => [{
      id: "reader", protocol: "consumer" as const, state: "Stable", members: [], topics: ["orders & audit"], partitions: [],
    }]);
    render(
      <MemoryRouter initialEntries={["/clusters/dev%20%26%20west/topics/orders%20%26%20audit"]}>
        <App
          queryClient={new QueryClient()}
          gatewayCredentials={gatewayCredentials}
          produceTopicMessage={produceTopicMessage}
          createTopic={createTopic}
          deleteTopic={deleteTopic}
          confirmTopicDeletion={confirmTopicDeletion}
          loadGatewayConfig={async () => [{ id: "dev & west", name: "Dev", url: "http://localhost:8081" }]}
          getCluster={pendingGetCluster}
          listTopics={pendingListTopics}
          listConsumerGroups={listGroups}
          getTopicDetail={async () => ({ name: "orders & audit", partitions: [], config: [] })}
          listLatestTopicMessages={pendingListLatestTopicMessages}
          searchTopicMessages={pendingSearchTopicMessages}
          linkOrigin={linkOrigin}
          copyMessageLink={copyMessageLink}
          statusRefreshMs={60_000}
        />
      </MemoryRouter>,
    );
    await user.click(await screen.findByRole("link", { name: "Consumers" }));
    expect(await screen.findByRole("heading", { name: "reader" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Consumers" }).getAttribute("aria-current")).toBe("page");
    expect(listGroups).toHaveBeenCalledWith("http://localhost:8081");
  });

  it("opens a topic found across clusters", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <App
          queryClient={new QueryClient()}
          gatewayCredentials={gatewayCredentials}
          produceTopicMessage={produceTopicMessage}
          createTopic={createTopic}
          deleteTopic={deleteTopic}
          confirmTopicDeletion={confirmTopicDeletion}
          loadGatewayConfig={async () => [{ id: "dev", name: "Dev", url: "http://localhost:8081" }]}
          getCluster={pendingGetCluster}
          listTopics={async () => [{ name: "orders", partitions: 1, replicationFactor: 1, internal: false, approxMessages: 1 }]}
          listConsumerGroups={pendingListConsumerGroups}
          getTopicDetail={async () => ({ name: "orders", partitions: [], config: [] })}
          listLatestTopicMessages={pendingListLatestTopicMessages}
          searchTopicMessages={pendingSearchTopicMessages}
          linkOrigin={linkOrigin}
          copyMessageLink={copyMessageLink}
          statusRefreshMs={60_000}
        />
      </MemoryRouter>,
    );

    await user.type(await screen.findByRole("searchbox", { name: "Topic name" }), "ORD");
    await user.click(await screen.findByRole("link", { name: "orders" }));
    expect(await screen.findByRole("heading", { name: "orders" })).toBeDefined();
  });

  it("copies and opens an exact message link with encoded names", async () => {
    const user = userEvent.setup();
    const copy = vi.fn(async (_text: string) => {});
    const list = vi.fn(async () => [
      { partition: 2, offset: Number("9007199254740993"), offsetExact: "9007199254740993", timestamp: "2026-01-02T03:04:05Z", key: null, value: "ZXhhY3Q=", headers: [] },
    ]);
    const app = () => (
      <App
        queryClient={new QueryClient()}
        gatewayCredentials={gatewayCredentials}
        produceTopicMessage={produceTopicMessage}
        createTopic={createTopic}
        deleteTopic={deleteTopic}
        confirmTopicDeletion={confirmTopicDeletion}
        loadGatewayConfig={async () => [{ id: "dev & west", name: "Dev", url: "http://localhost:8081" }]}
        getCluster={pendingGetCluster}
        listTopics={pendingListTopics}
        listConsumerGroups={pendingListConsumerGroups}
        getTopicDetail={pendingGetTopicDetail}
        listLatestTopicMessages={list}
        searchTopicMessages={pendingSearchTopicMessages}
        linkOrigin="https://console.example"
        copyMessageLink={copy}
        statusRefreshMs={60_000}
      />
    );
    const first = render(<MemoryRouter initialEntries={["/clusters/dev%20%26%20west/topics/orders%20%26%20audit/messages"]}>{app()}</MemoryRouter>);
    await user.click(await screen.findByRole("button", { name: "Copy link for partition 2 offset 9007199254740993" }));
    const copied = copy.mock.calls[0][0];
    first.unmount();

    const url = new URL(copied);
    render(
      <MemoryRouter initialEntries={[url.pathname + url.search]}>
        <HistoryControls />
        {app()}
      </MemoryRouter>,
    );
    expect(await screen.findByText("exact")).toBeDefined();
    expect(list).toHaveBeenLastCalledWith("http://localhost:8081", "orders & audit", {
      partition: 2,
      offset: "9007199254740993",
    });

    const breadcrumb = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect((await within(breadcrumb).findByRole("link", { name: "Dev" })).getAttribute("href")).toBe(
      "/clusters/dev%20%26%20west",
    );
    await user.click(within(breadcrumb).getByRole("link", { name: "Topics" }));
    const clusterSections = await screen.findByRole("navigation", { name: "Cluster sections" });
    expect(within(clusterSections).getByRole("link", { name: "Topics" }).getAttribute("aria-current")).toBe("page");
    expect(
      within(screen.getByRole("navigation", { name: "Breadcrumb" })).getByText("Topics").getAttribute("aria-current"),
    ).toBe("page");

    await user.click(screen.getByRole("button", { name: "Go back" }));
    const topicViews = await screen.findByRole("navigation", { name: "Topic views" });
    expect(within(topicViews).getByRole("link", { name: "Messages" }).getAttribute("aria-current")).toBe("page");
    expect(
      within(screen.getByRole("navigation", { name: "Breadcrumb" }))
        .getByText("orders & audit")
        .getAttribute("aria-current"),
    ).toBe("page");
    expect(await screen.findByText("exact")).toBeDefined();

    await user.click(screen.getByRole("button", { name: "Go forward" }));
    const forwardSections = await screen.findByRole("navigation", { name: "Cluster sections" });
    expect(within(forwardSections).getByRole("link", { name: "Topics" }).getAttribute("aria-current")).toBe("page");
  });

  it("allows authentication and removal from a direct topic link", async () => {
    const user = userEvent.setup();
    const tokens = new Map<string, string>();
    const credentials = {
      read: (url: string) => tokens.get(url) ?? null,
      save: (url: string, token: string) => { tokens.set(url, token); },
      clear: (url: string) => { tokens.delete(url); },
    };
    const url = "https://gateway.example";
    render(
      <MemoryRouter initialEntries={["/clusters/dev/topics/orders"]}>
        <App
          queryClient={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
          gatewayCredentials={credentials}
          produceTopicMessage={produceTopicMessage}
          createTopic={createTopic}
          deleteTopic={deleteTopic}
          confirmTopicDeletion={confirmTopicDeletion}
          loadGatewayConfig={async () => [{ id: "dev", name: "Dev", url }]}
          getCluster={pendingGetCluster}
          listTopics={pendingListTopics}
          listConsumerGroups={pendingListConsumerGroups}
          getTopicDetail={async () => {
            if (!tokens.has(url)) throw new HttpError(401, "unauthorized");
            return { name: "orders", partitions: [], config: [] };
          }}
          listLatestTopicMessages={pendingListLatestTopicMessages}
          searchTopicMessages={pendingSearchTopicMessages}
          linkOrigin={linkOrigin}
          copyMessageLink={copyMessageLink}
          statusRefreshMs={60_000}
        />
      </MemoryRouter>,
    );
    expect(await screen.findByText("Authentication required")).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Manage credentials for Dev" }));
    await user.type(screen.getByLabelText("Token for Dev"), "a".repeat(32));
    await user.click(screen.getByRole("button", { name: "Use token" }));
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(await screen.findByRole("table", { name: "Topic partitions" })).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Gateway credentials" }));
    await user.click(screen.getByRole("button", { name: "Remove token" }));
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(await screen.findByText("Authentication required")).toBeDefined();
    expect(screen.queryByRole("table", { name: "Topic partitions" })).toBeNull();
  });

  it("requires confirmation and displays accepted deletion on the topic route", async () => {
    const user = userEvent.setup();
    const confirm = vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(true);
    const remove = vi.fn(async () => {});
    render(
      <MemoryRouter initialEntries={["/clusters/dev/topics/orders"]}>
        <App
          queryClient={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
          gatewayCredentials={gatewayCredentials}
          produceTopicMessage={produceTopicMessage}
          createTopic={createTopic}
          deleteTopic={remove}
          confirmTopicDeletion={confirm}
          loadGatewayConfig={async () => [{ id: "dev", name: "Dev", url: "https://gateway" }]}
          getCluster={pendingGetCluster}
          listTopics={pendingListTopics}
          listConsumerGroups={pendingListConsumerGroups}
          getTopicDetail={async () => ({ name: "orders", partitions: [], config: [] })}
          listLatestTopicMessages={pendingListLatestTopicMessages}
          searchTopicMessages={pendingSearchTopicMessages}
          linkOrigin={linkOrigin}
          copyMessageLink={copyMessageLink}
          statusRefreshMs={60_000}
        />
      </MemoryRouter>,
    );
    await user.click(await screen.findByRole("button", { name: "Delete topic" }));
    expect(remove).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Delete topic" }));
    expect(await screen.findByText(/Deletion was accepted/)).toBeDefined();
    expect(remove).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledWith("https://gateway", "orders");
  });

  it("renders the clusters page with the injected config loader", async () => {
    renderApp();

    expect(await screen.findByRole("heading", { name: "No gateways configured" })).toBeDefined();
  });
});
