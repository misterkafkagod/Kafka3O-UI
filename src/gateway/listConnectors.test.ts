import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../test/server";
import { fetchJson } from "./fetchJson";
import { listConnectors } from "./listConnectors";

const realFetchJson = (url: string) => fetchJson(fetch, url, 1000);

describe("listConnectors", () => {
  it("reads the cluster's connectors", async () => {
    const connectors = [{ name: "orders-sink", type: "sink", state: "RUNNING", workerId: "w:8083", tasks: [] }];
    server.use(http.get("http://localhost:8081/api/v1/connect/connectors", () => HttpResponse.json(connectors)));

    await expect(listConnectors(realFetchJson, "http://localhost:8081/")).resolves.toEqual(connectors);
  });

  it("rejects with the not-configured problem", async () => {
    server.use(http.get("http://localhost:8081/api/v1/connect/connectors", () =>
      HttpResponse.json({ code: "connect_not_configured" }, { status: 404 })));

    await expect(listConnectors(realFetchJson, "http://localhost:8081")).rejects.toMatchObject({ status: 404, problem: { code: "connect_not_configured" } });
  });
});
