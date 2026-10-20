import { screen, within } from "@testing-library/react";
import { delay, http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { loadGatewayConfig } from "../config/loadGatewayConfig";
import { fetchJson } from "../gateway/fetchJson";
import { getCluster } from "../gateway/getCluster";
import { renderWithQuery } from "../test/renderWithQuery";
import { server } from "../test/server";
import { ClustersPage } from "./ClustersPage";

const realFetchJson = (url: string) => fetchJson(fetch, url, 1000);
const load = () => loadGatewayConfig(realFetchJson);
const realGetCluster = (url: string) => getCluster(realFetchJson, url);
const pendingGetCluster = () => new Promise<never>(() => {});

const dev = { id: "dev", name: "Dev", url: "http://localhost:8081" };
const prod = { id: "prod", name: "Prod", url: "http://localhost:8082" };

describe("ClustersPage", () => {
  it("shows one card per configured gateway (F1-AC1)", async () => {
    server.use(http.get("/config.json", () => HttpResponse.json({ gateways: [dev, prod] })));

    renderWithQuery(<ClustersPage loadGatewayConfig={load} getCluster={pendingGetCluster} />);

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

    renderWithQuery(<ClustersPage loadGatewayConfig={load} getCluster={realGetCluster} />);

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

    renderWithQuery(<ClustersPage loadGatewayConfig={load} getCluster={realGetCluster} />);

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
      <ClustersPage
        loadGatewayConfig={() => loadGatewayConfig(fastFetchJson)}
        getCluster={(url) => getCluster(fastFetchJson, url)}
      />,
    );

    const prodCard = await screen.findByRole("article", { name: "Prod" });
    expect(await within(prodCard).findByText("Gateway unreachable")).toBeDefined();
  });

  it("shows No gateways configured when config.json is missing (F1-AC6)", async () => {
    server.use(http.get("/config.json", () => new HttpResponse(null, { status: 404 })));

    renderWithQuery(<ClustersPage loadGatewayConfig={load} getCluster={pendingGetCluster} />);

    expect(await screen.findByRole("heading", { name: "No gateways configured" })).toBeDefined();
  });

  it("shows No gateways configured when the list is empty (F1-AC6)", async () => {
    server.use(http.get("/config.json", () => HttpResponse.json({ gateways: [] })));

    renderWithQuery(<ClustersPage loadGatewayConfig={load} getCluster={pendingGetCluster} />);

    expect(await screen.findByRole("heading", { name: "No gateways configured" })).toBeDefined();
  });
});
