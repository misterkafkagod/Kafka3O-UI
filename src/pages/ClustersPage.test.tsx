import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { loadGatewayConfig } from "../config/loadGatewayConfig";
import { fetchJson } from "../gateway/fetchJson";
import { renderWithQuery } from "../test/renderWithQuery";
import { server } from "../test/server";
import { ClustersPage } from "./ClustersPage";

const load = () => loadGatewayConfig((url) => fetchJson(fetch, url, 1000));

describe("ClustersPage", () => {
  it("shows one card per configured gateway (F1-AC1)", async () => {
    server.use(
      http.get("/config.json", () =>
        HttpResponse.json({
          gateways: [
            { id: "dev", name: "Dev", url: "http://localhost:8081" },
            { id: "prod", name: "Prod", url: "http://localhost:8082" },
          ],
        }),
      ),
    );

    renderWithQuery(<ClustersPage loadGatewayConfig={load} />);

    expect(await screen.findByRole("article", { name: "Dev" })).toBeDefined();
    expect(screen.getByRole("article", { name: "Prod" })).toBeDefined();
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });

  it("shows No gateways configured when config.json is missing (F1-AC6)", async () => {
    server.use(http.get("/config.json", () => new HttpResponse(null, { status: 404 })));

    renderWithQuery(<ClustersPage loadGatewayConfig={load} />);

    expect(await screen.findByRole("heading", { name: "No gateways configured" })).toBeDefined();
  });

  it("shows No gateways configured when the list is empty (F1-AC6)", async () => {
    server.use(http.get("/config.json", () => HttpResponse.json({ gateways: [] })));

    renderWithQuery(<ClustersPage loadGatewayConfig={load} />);

    expect(await screen.findByRole("heading", { name: "No gateways configured" })).toBeDefined();
  });
});
