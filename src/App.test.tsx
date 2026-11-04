import { QueryClient } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { App } from "./App";

const pendingGetCluster = () => new Promise<never>(() => {});
const pendingListTopics = () => new Promise<never>(() => {});
const pendingGetTopicDetail = () => new Promise<never>(() => {});
const pendingListLatestTopicMessages = () => new Promise<never>(() => {});
const pendingSearchTopicMessages = () => new Promise<never>(() => {});

function renderApp() {
  return render(
    <MemoryRouter>
      <App
        queryClient={new QueryClient()}
        loadGatewayConfig={async () => []}
        getCluster={pendingGetCluster}
        listTopics={pendingListTopics}
        getTopicDetail={pendingGetTopicDetail}
        listLatestTopicMessages={pendingListLatestTopicMessages}
        searchTopicMessages={pendingSearchTopicMessages}
        statusRefreshMs={60_000}
      />
    </MemoryRouter>,
  );
}

describe("App", () => {
  it("renders the Kafka3O header", () => {
    renderApp();

    expect(screen.getByRole("heading", { name: "Kafka3O" })).toBeDefined();
  });

  it("header links to /", () => {
    renderApp();

    expect(screen.getByRole("link", { name: "Kafka3O" }).getAttribute("href")).toBe("/");
  });

  it("clicking the Dev card opens its cluster page", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <App
          queryClient={new QueryClient()}
          loadGatewayConfig={async () => [{ id: "dev", name: "Dev", url: "http://localhost:8081" }]}
          getCluster={async () => ({ clusterId: "abc", controllerId: 1, brokers: [{ id: 1, host: "kafka-dev", port: 9092 }] })}
          listTopics={async () => [{ name: "orders", partitions: 6, replicationFactor: 1, internal: false, approxMessages: 10 }]}
          getTopicDetail={pendingGetTopicDetail}
          listLatestTopicMessages={pendingListLatestTopicMessages}
          searchTopicMessages={pendingSearchTopicMessages}
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
          loadGatewayConfig={async () => [{ id: "dev", name: "Dev", url: "http://localhost:8081" }]}
          getCluster={pendingGetCluster}
          listTopics={async () => [{ name: "orders", partitions: 6, replicationFactor: 1, internal: false, approxMessages: 10 }]}
          getTopicDetail={pendingGetTopicDetail}
          listLatestTopicMessages={pendingListLatestTopicMessages}
          searchTopicMessages={pendingSearchTopicMessages}
          statusRefreshMs={60_000}
        />
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole("link", { name: "Topics" }));

    expect(await screen.findByRole("table", { name: "Topics" })).toBeDefined();
    expect(screen.getByText("orders")).toBeDefined();
  });

  it("clicking a topic opens its detail page", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/clusters/dev/topics"]}>
        <App
          queryClient={new QueryClient()}
          loadGatewayConfig={async () => [{ id: "dev", name: "Dev", url: "http://localhost:8081" }]}
          getCluster={pendingGetCluster}
          listTopics={async () => [{ name: "orders", partitions: 1, replicationFactor: 1, internal: false, approxMessages: 1 }]}
          getTopicDetail={async () => ({
            name: "orders",
            partitions: [{ id: 0, leader: 1, replicas: [1], isr: [1], startOffset: 0, endOffset: 1 }],
            config: [],
          })}
          listLatestTopicMessages={async () => []}
          searchTopicMessages={pendingSearchTopicMessages}
          statusRefreshMs={60_000}
        />
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole("link", { name: "orders" }));

    expect(await screen.findByRole("table", { name: "Topic partitions" })).toBeDefined();
    await user.click(screen.getByRole("link", { name: "Messages" }));
    expect(await screen.findByText("No messages found.")).toBeDefined();
  });

  it("opens a topic found across clusters", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <App
          queryClient={new QueryClient()}
          loadGatewayConfig={async () => [{ id: "dev", name: "Dev", url: "http://localhost:8081" }]}
          getCluster={pendingGetCluster}
          listTopics={async () => [{ name: "orders", partitions: 1, replicationFactor: 1, internal: false, approxMessages: 1 }]}
          getTopicDetail={async () => ({ name: "orders", partitions: [], config: [] })}
          listLatestTopicMessages={pendingListLatestTopicMessages}
          searchTopicMessages={pendingSearchTopicMessages}
          statusRefreshMs={60_000}
        />
      </MemoryRouter>,
    );

    await user.type(await screen.findByRole("searchbox", { name: "Topic name" }), "ORD");
    await user.click(await screen.findByRole("link", { name: "orders" }));
    expect(await screen.findByRole("heading", { name: "orders" })).toBeDefined();
  });

  it("renders the clusters page with the injected config loader", async () => {
    renderApp();

    expect(await screen.findByRole("heading", { name: "No gateways configured" })).toBeDefined();
  });
});
