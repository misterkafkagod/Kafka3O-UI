import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";
import { loadGatewayConfig } from "../config/loadGatewayConfig";
import { fetchJson } from "../gateway/fetchJson";
import { getCluster } from "../gateway/getCluster";
import { renderWithQuery } from "../test/renderWithQuery";
import { server } from "../test/server";
import { ClusterPage } from "./ClusterPage";

const realFetchJson = (url: string) => fetchJson(fetch, url, 1000);
const dev = { id: "dev", name: "Dev", url: "http://localhost:8081" };

function renderClusterPage(route: string) {
  return renderWithQuery(
    <Routes>
      <Route
        path="/clusters/:gatewayId"
        element={
          <ClusterPage
            loadGatewayConfig={() => loadGatewayConfig(realFetchJson)}
            getCluster={(url) => getCluster(realFetchJson, url)}
            statusRefreshMs={60_000}
          />
        }
      />
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
});
