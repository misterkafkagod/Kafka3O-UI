import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../test/server";
import { fetchJson } from "./fetchJson";
import { getCluster } from "./getCluster";
import { HttpError } from "./HttpError";

const realFetchJson = (url: string) => fetchJson(fetch, url, 1000);
const cluster = { clusterId: "abc", controllerId: 1, brokers: [{ id: 1, host: "kafka-dev", port: 9092 }] };

describe("getCluster", () => {
  it("calls GET {gatewayUrl}/api/v1/cluster and returns the cluster", async () => {
    server.use(http.get("http://localhost:8081/api/v1/cluster", () => HttpResponse.json(cluster)));

    await expect(getCluster(realFetchJson, "http://localhost:8081")).resolves.toEqual(cluster);
  });

  it("ignores a trailing slash in the gateway URL", async () => {
    server.use(http.get("http://localhost:8081/api/v1/cluster", () => HttpResponse.json(cluster)));

    await expect(getCluster(realFetchJson, "http://localhost:8081/")).resolves.toEqual(cluster);
  });

  it("rejects with HttpError when the gateway fails", async () => {
    server.use(http.get("http://localhost:8081/api/v1/cluster", () => new HttpResponse(null, { status: 500 })));

    await expect(getCluster(realFetchJson, "http://localhost:8081")).rejects.toBeInstanceOf(HttpError);
  });
});
