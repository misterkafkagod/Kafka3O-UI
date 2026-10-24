import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../test/server";
import { fetchJson } from "./fetchJson";
import { HttpError } from "./HttpError";
import { listTopics } from "./listTopics";

const realFetchJson = (url: string) => fetchJson(fetch, url, 1000);
const topics = [{ name: "orders", partitions: 6, replicationFactor: 1, internal: false, approxMessages: 1000 }];

describe("listTopics", () => {
  it("calls GET {gatewayUrl}/api/v1/topics and returns the topics", async () => {
    server.use(http.get("http://localhost:8081/api/v1/topics", () => HttpResponse.json(topics)));

    await expect(listTopics(realFetchJson, "http://localhost:8081")).resolves.toEqual(topics);
  });

  it("ignores a trailing slash in the gateway URL", async () => {
    server.use(http.get("http://localhost:8081/api/v1/topics", () => HttpResponse.json(topics)));

    await expect(listTopics(realFetchJson, "http://localhost:8081/")).resolves.toEqual(topics);
  });

  it("rejects with HttpError when the gateway fails", async () => {
    server.use(http.get("http://localhost:8081/api/v1/topics", () => new HttpResponse(null, { status: 503 })));

    await expect(listTopics(realFetchJson, "http://localhost:8081")).rejects.toBeInstanceOf(HttpError);
  });
});
