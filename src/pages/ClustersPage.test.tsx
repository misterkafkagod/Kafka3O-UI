import { screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
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
