import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../test/server";
import { fetchJson } from "./fetchJson";
import { getMetrics } from "./getMetrics";

const realFetchJson = (url: string) => fetchJson(fetch, url, 1000);

describe("getMetrics", () => {
  it("reads the cluster's metrics", async () => {
    const metrics = { readAt: "2026-11-10T12:00:00Z", logDirs: { dirs: [{ broker: 1, dir: "/data", totalBytes: 100, usableBytes: null, kafkaBytes: 7 }] } };
    server.use(http.get("http://localhost:8081/api/v1/metrics", () => HttpResponse.json(metrics)));

    await expect(getMetrics(realFetchJson, "http://localhost:8081/")).resolves.toEqual(metrics);
  });
});
