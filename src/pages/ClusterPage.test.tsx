import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";
import { loadGatewayConfig } from "../config/loadGatewayConfig";
import { fetchJson } from "../gateway/fetchJson";
import { getCluster } from "../gateway/getCluster";
import { listTopics } from "../gateway/listTopics";
import { renderWithQuery } from "../test/renderWithQuery";
import { server } from "../test/server";
import { ClusterPage } from "./ClusterPage";

const realFetchJson = (url: string) => fetchJson(fetch, url, 1000);
const dev = { id: "dev", name: "Dev", url: "http://localhost:8081" };

const pageProps = {
  loadGatewayConfig: () => loadGatewayConfig(realFetchJson),
  getCluster: (url: string) => getCluster(realFetchJson, url),
  listTopics: (url: string) => listTopics(realFetchJson, url),
  statusRefreshMs: 60_000,
};

function renderClusterPage(route: string) {
  return renderWithQuery(
    <Routes>
      <Route path="/" element={<p>Overview</p>} />
      <Route path="/clusters/:gatewayId" element={<ClusterPage {...pageProps} view="brokers" />} />
      <Route path="/clusters/:gatewayId/topics" element={<ClusterPage {...pageProps} view="topics" />} />
    </Routes>,
    route,
  );
}

describe("ClusterPage", () => {
  it("shows cluster ID, controller and brokers in ID order (F2-AC1)", async () => {
    server.use(
      http.get("/config.json", () => HttpResponse.json({ gateways: [dev] })),
      http.get("http://localhost:8081/api/v1/cluster", () =>
        HttpResponse.json({
          clusterId: "nDF93h0CSDizRRs5DIdLeQ",
          controllerId: 2,
          brokers: [
            { id: 3, host: "kafka-3", port: 9092 },
            { id: 1, host: "kafka-1", port: 9092 },
            { id: 2, host: "kafka-2", port: 9092 },
          ],
        }),
      ),
    );

    renderClusterPage("/clusters/dev");

    expect(await screen.findByText("Cluster ID: nDF93h0CSDizRRs5DIdLeQ")).toBeDefined();
    expect(screen.getByText("Controller: 2")).toBeDefined();
    const [, body] = within(screen.getByRole("table", { name: "Brokers" })).getAllByRole("rowgroup");
    const ids = within(body)
      .getAllByRole("row")
      .map((row) => within(row).getAllByRole("cell")[0].textContent);
    expect(ids).toEqual(["1", "2", "3"]);
  });

  it("shows an error with Retry, then the brokers after Retry (F2-AC2)", async () => {
    server.use(
      http.get("/config.json", () => HttpResponse.json({ gateways: [dev] })),
      http.get("http://localhost:8081/api/v1/cluster", () => HttpResponse.error()),
    );

    renderClusterPage("/clusters/dev");

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("Gateway unreachable")).toBeDefined();

    server.use(
      http.get("http://localhost:8081/api/v1/cluster", () =>
        HttpResponse.json({ clusterId: "abc", controllerId: 1, brokers: [{ id: 1, host: "kafka-dev", port: 9092 }] }),
      ),
    );
    await userEvent.click(within(alert).getByRole("button", { name: "Retry" }));

    expect(await screen.findByRole("table", { name: "Brokers" })).toBeDefined();
    expect(screen.getByText("kafka-dev:9092")).toBeDefined();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows Cluster not found with a link to / (F2-AC3)", async () => {
    // Only config is handled: any gateway call fails the test via onUnhandledFrame: "error".
    server.use(http.get("/config.json", () => HttpResponse.json({ gateways: [dev] })));

    renderClusterPage("/clusters/unknown");

    expect(await screen.findByRole("heading", { name: "Cluster not found" })).toBeDefined();
    await userEvent.click(screen.getByRole("link", { name: "Back to all clusters" }));
    expect(screen.getByText("Overview")).toBeDefined();
  });

  it("lists topics sorted by name with partitions, RF and ~count (F3-AC1)", async () => {
    server.use(
      http.get("/config.json", () => HttpResponse.json({ gateways: [dev] })),
      http.get("http://localhost:8081/api/v1/topics", () =>
        HttpResponse.json([
          { name: "orders", partitions: 6, replicationFactor: 3, internal: false, approxMessages: 1000 },
          { name: "audit", partitions: 1, replicationFactor: 3, internal: false, approxMessages: 0 },
        ]),
      ),
    );

    renderClusterPage("/clusters/dev/topics");

    const table = await screen.findByRole("table", { name: "Topics" });
    const [, body] = within(table).getAllByRole("rowgroup");
    const rows = within(body)
      .getAllByRole("row")
      .map((row) => within(row).getAllByRole("cell").map((cell) => cell.textContent));
    expect(rows).toEqual([
      ["audit", "1", "3", "~0"],
      ["orders", "6", "3", "~1000"],
    ]);
    expect(screen.getByRole("link", { name: "Topics" }).getAttribute("aria-current")).toBe("page");
  });

  it("shows the topics error with Retry, then topics after Retry (F3-AC5)", async () => {
    server.use(
      http.get("/config.json", () => HttpResponse.json({ gateways: [dev] })),
      http.get("http://localhost:8081/api/v1/topics", () =>
        HttpResponse.json(
          { title: "Cluster unreachable", status: 503, detail: "Kafka is unreachable: dial tcp: connection refused", code: "cluster_unreachable" },
          { status: 503, headers: { "Content-Type": "application/problem+json" } },
        ),
      ),
    );

    renderClusterPage("/clusters/dev/topics");

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("Cluster unreachable")).toBeDefined();
    expect(within(alert).getByText("Kafka is unreachable: dial tcp: connection refused")).toBeDefined();

    server.use(
      http.get("http://localhost:8081/api/v1/topics", () =>
        HttpResponse.json([{ name: "orders", partitions: 6, replicationFactor: 1, internal: false, approxMessages: 1000 }]),
      ),
    );
    await userEvent.click(within(alert).getByRole("button", { name: "Retry" }));

    expect(await screen.findByRole("table", { name: "Topics" })).toBeDefined();
    expect(screen.getByText("orders")).toBeDefined();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
