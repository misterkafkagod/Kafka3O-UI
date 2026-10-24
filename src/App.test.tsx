import { QueryClient } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { App } from "./App";

const pendingGetCluster = () => new Promise<never>(() => {});
const pendingListTopics = () => new Promise<never>(() => {});

function renderApp() {
  return render(
    <MemoryRouter>
      <App
        queryClient={new QueryClient()}
        loadGatewayConfig={async () => []}
        getCluster={pendingGetCluster}
        listTopics={pendingListTopics}
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
          statusRefreshMs={60_000}
        />
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole("link", { name: "Topics" }));

    expect(await screen.findByRole("table", { name: "Topics" })).toBeDefined();
    expect(screen.getByText("orders")).toBeDefined();
  });

  it("renders the clusters page with the injected config loader", async () => {
    renderApp();

    expect(await screen.findByRole("heading", { name: "No gateways configured" })).toBeDefined();
  });
});
