import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../test/server";
import { fetchJson } from "./fetchJson";
import { HttpError } from "./HttpError";
import { listConsumerGroups } from "./listConsumerGroups";

const realFetchJson = (url: string) => fetchJson(fetch, url, 1000);
const groups = [{
  id: "orders-group", protocol: "classic", state: "Stable", members: [], topics: ["orders"],
  partitions: [{
    topic: "orders", partition: 0, committedOffset: "9007199254740993",
    startOffset: "0", endOffset: "9007199254740995", lag: "2", status: "ok",
  }],
}];

describe("listConsumerGroups", () => {
  it("requests groups from the configured gateway and preserves exact offsets", async () => {
    server.use(http.get("http://localhost:8081/api/v1/consumer-groups", () => HttpResponse.json(groups)));

    await expect(listConsumerGroups(realFetchJson, "http://localhost:8081/")).resolves.toEqual(groups);
  });

  it("propagates gateway failures", async () => {
    server.use(http.get("http://localhost:8081/api/v1/consumer-groups", () => new HttpResponse(null, { status: 503 })));

    await expect(listConsumerGroups(realFetchJson, "http://localhost:8081")).rejects.toBeInstanceOf(HttpError);
  });
});
