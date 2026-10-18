import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { fetchJson } from "../gateway/fetchJson";
import { server } from "../test/server";
import { loadGatewayConfig } from "./loadGatewayConfig";

const dev = { id: "dev", name: "Dev", url: "http://localhost:8081" };
const prod = { id: "prod", name: "Prod", url: "http://localhost:8082" };
const realFetchJson = (url: string) => fetchJson(fetch, url, 1000);

describe("loadGatewayConfig", () => {
  it("requests /config.json and returns its gateways", async () => {
    server.use(http.get("/config.json", () => HttpResponse.json({ gateways: [dev, prod] })));

    await expect(loadGatewayConfig(realFetchJson)).resolves.toEqual([dev, prod]);
  });

  it("returns an empty list on 404", async () => {
    server.use(http.get("/config.json", () => new HttpResponse(null, { status: 404 })));

    await expect(loadGatewayConfig(realFetchJson)).resolves.toEqual([]);
  });

  it("returns an empty list when the host answers with index.html", async () => {
    server.use(http.get("/config.json", () => HttpResponse.html("<!doctype html><html></html>")));

    await expect(loadGatewayConfig(realFetchJson)).resolves.toEqual([]);
  });

  it("returns an empty list on a network error", async () => {
    server.use(http.get("/config.json", () => HttpResponse.error()));

    await expect(loadGatewayConfig(realFetchJson)).resolves.toEqual([]);
  });

  it("returns an empty list when the config is invalid", async () => {
    server.use(http.get("/config.json", () => HttpResponse.json({ gateways: [{ id: "dev" }] })));

    await expect(loadGatewayConfig(realFetchJson)).resolves.toEqual([]);
  });
});
