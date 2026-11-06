import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { loadGatewayConfig, type LoadGatewayConfig } from "../config/loadGatewayConfig";
import { fetchJson } from "../gateway/fetchJson";
import { getCluster } from "../gateway/getCluster";
import { renderWithQuery } from "../test/renderWithQuery";
import { server } from "../test/server";
import { ClustersPage } from "./ClustersPage";

const realFetchJson = (url: string) => fetchJson(fetch, url, 1000);
const load = () => loadGatewayConfig(realFetchJson);
const realGetCluster = (url: string) => getCluster(realFetchJson, url);
const pendingGetCluster = () => new Promise<never>(() => {});
const pendingListTopics = () => new Promise<never>(() => {});

const dev = { id: "dev", name: "Dev", url: "http://localhost:8081" };
const prod = { id: "prod", name: "Prod", url: "http://localhost:8082" };

describe("ClustersPage", () => {
  it("announces configuration loading", () => {
    renderWithQuery(<ClustersPage statusRefreshMs={60_000} loadGatewayConfig={() => new Promise<never>(() => {})} getCluster={pendingGetCluster} listTopics={pendingListTopics} />);

    expect(screen.getByRole("status").textContent).toBe("Loading…");
  });

  it("reports a configuration transport failure and retries without claiming there are no gateways", async () => {
    server.use(http.get("/config.json", () => HttpResponse.error()));
    renderWithQuery(<ClustersPage statusRefreshMs={60_000} loadGatewayConfig={load} getCluster={pendingGetCluster} listTopics={pendingListTopics} />);

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("Gateway configuration unavailable")).toBeDefined();
    expect(screen.queryByText("No gateways configured")).toBeNull();
    server.use(http.get("/config.json", () => HttpResponse.json({ gateways: [dev] })));
    await userEvent.click(within(alert).getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("article", { name: "Dev" })).toBeDefined();
  });

  it("does not display stale gateway cards after configuration refresh fails", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const loadConfig = vi.fn<LoadGatewayConfig>().mockResolvedValueOnce([dev]).mockRejectedValueOnce(new TypeError("Failed to fetch"));
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <ClustersPage statusRefreshMs={60_000} loadGatewayConfig={loadConfig} getCluster={pendingGetCluster} listTopics={pendingListTopics} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole("article", { name: "Dev" })).toBeDefined();
    await act(async () => { await client.refetchQueries({ queryKey: ["config"] }); });
    expect(await screen.findByRole("alert")).toBeDefined();
    expect(screen.queryByRole("article", { name: "Dev" })).toBeNull();
  });

  it("shows one card per configured gateway (F1-AC1)", async () => {
    server.use(http.get("/config.json", () => HttpResponse.json({ gateways: [dev, prod] })));

    renderWithQuery(<ClustersPage statusRefreshMs={60_000} loadGatewayConfig={load} getCluster={pendingGetCluster} listTopics={pendingListTopics} />);

    expect(await screen.findByRole("article", { name: "Dev" })).toBeDefined();
    expect(screen.getByRole("article", { name: "Prod" })).toBeDefined();
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });

  it("shows Healthy, cluster ID and 3 brokers (F1-AC2)", async () => {
    server.use(
      http.get("/config.json", () => HttpResponse.json({ gateways: [dev] })),
      http.get("http://localhost:8081/api/v1/cluster", () =>
        HttpResponse.json({
          clusterId: "MkU3OEVBNTcwNTJENDM2Qk",
          controllerId: 1,
          brokers: [
            { id: 1, host: "kafka-1", port: 9092 },
            { id: 2, host: "kafka-2", port: 9092 },
            { id: 3, host: "kafka-3", port: 9092 },
          ],
        }),
      ),
    );

    renderWithQuery(<ClustersPage statusRefreshMs={60_000} loadGatewayConfig={load} getCluster={realGetCluster} listTopics={pendingListTopics} />);

    const card = await screen.findByRole("article", { name: "Dev" });
    expect(await within(card).findByText("Healthy")).toBeDefined();
    expect(within(card).getByText("Cluster ID: MkU3OEVBNTcwNTJENDM2Qk")).toBeDefined();
    expect(within(card).getByText("3 brokers")).toBeDefined();
  });

  it("isolates an unreachable gateway to its card (F1-AC3)", async () => {
    server.use(
      http.get("/config.json", () => HttpResponse.json({ gateways: [dev, prod] })),
      http.get("http://localhost:8081/api/v1/cluster", () =>
        HttpResponse.json({ clusterId: "dev-id", controllerId: 1, brokers: [{ id: 1, host: "kafka-dev", port: 9092 }] }),
      ),
      http.get("http://localhost:8082/api/v1/cluster", () => HttpResponse.error()),
    );

    renderWithQuery(<ClustersPage statusRefreshMs={60_000} loadGatewayConfig={load} getCluster={realGetCluster} listTopics={pendingListTopics} />);

    const prodCard = await screen.findByRole("article", { name: "Prod" });
    expect(await within(prodCard).findByText("Gateway unreachable")).toBeDefined();
    const devCard = screen.getByRole("article", { name: "Dev" });
    expect(await within(devCard).findByText("Healthy")).toBeDefined();
  });

  it("shows Gateway unreachable when a gateway times out (F1-AC3)", async () => {
    const fastFetchJson = (url: string) => fetchJson(fetch, url, 50);
    server.use(
      http.get("/config.json", () => HttpResponse.json({ gateways: [prod] })),
      http.get("http://localhost:8082/api/v1/cluster", async () => {
        await delay(500);
        return HttpResponse.json({ clusterId: "late", controllerId: 1, brokers: [] });
      }),
    );

    renderWithQuery(
      <ClustersPage statusRefreshMs={60_000}
        loadGatewayConfig={() => loadGatewayConfig(fastFetchJson)}
        getCluster={(url) => getCluster(fastFetchJson, url)}
        listTopics={pendingListTopics}
      />,
    );

    const prodCard = await screen.findByRole("article", { name: "Prod" });
    expect(await within(prodCard).findByText("Gateway unreachable")).toBeDefined();
  });

  it("shows Cluster unreachable with the gateway message (F1-AC4)", async () => {
    server.use(
      http.get("/config.json", () => HttpResponse.json({ gateways: [prod] })),
      http.get("http://localhost:8082/api/v1/cluster", () =>
        HttpResponse.json(
          {
            title: "Cluster unreachable",
            status: 503,
            code: "cluster_unreachable",
            detail: "Kafka is unreachable: unable to dial: dial tcp: lookup kafka-prod: no such host",
          },
          { status: 503, headers: { "Content-Type": "application/problem+json" } },
        ),
      ),
    );

    renderWithQuery(<ClustersPage statusRefreshMs={60_000} loadGatewayConfig={load} getCluster={realGetCluster} listTopics={pendingListTopics} />);

    const prodCard = await screen.findByRole("article", { name: "Prod" });
    expect(await within(prodCard).findByText("Cluster unreachable")).toBeDefined();
    expect(
      within(prodCard).getByText("Kafka is unreachable: unable to dial: dial tcp: lookup kafka-prod: no such host"),
    ).toBeDefined();
  });

  it("turns a Healthy card into Gateway unreachable on the next refresh (F1-AC5)", async () => {
    server.use(
      http.get("/config.json", () => HttpResponse.json({ gateways: [prod] })),
      http.get("http://localhost:8082/api/v1/cluster", () =>
        HttpResponse.json({ clusterId: "prod-id", controllerId: 1, brokers: [{ id: 1, host: "kafka-prod", port: 9092 }] }),
      ),
    );

    renderWithQuery(<ClustersPage statusRefreshMs={50} loadGatewayConfig={load} getCluster={realGetCluster} listTopics={pendingListTopics} />);

    const prodCard = await screen.findByRole("article", { name: "Prod" });
    expect(await within(prodCard).findByText("Healthy")).toBeDefined();

    server.use(http.get("http://localhost:8082/api/v1/cluster", () => HttpResponse.error()));

    expect(await within(prodCard).findByText("Gateway unreachable")).toBeDefined();
    expect(within(prodCard).queryByText("Healthy")).toBeNull();
  });

  it("shows No gateways configured when config.json is missing (F1-AC6)", async () => {
    server.use(http.get("/config.json", () => new HttpResponse(null, { status: 404 })));

    renderWithQuery(<ClustersPage statusRefreshMs={60_000} loadGatewayConfig={load} getCluster={pendingGetCluster} listTopics={pendingListTopics} />);

    expect(await screen.findByRole("heading", { name: "No gateways configured" })).toBeDefined();
  });

  it("shows No gateways configured when the list is empty (F1-AC6)", async () => {
    server.use(http.get("/config.json", () => HttpResponse.json({ gateways: [] })));

    renderWithQuery(<ClustersPage statusRefreshMs={60_000} loadGatewayConfig={load} getCluster={pendingGetCluster} listTopics={pendingListTopics} />);

    expect(await screen.findByRole("heading", { name: "No gateways configured" })).toBeDefined();
  });
});
