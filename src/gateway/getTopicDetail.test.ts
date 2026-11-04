import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../test/server";
import { fetchJson } from "./fetchJson";
import { getTopicDetail } from "./getTopicDetail";
import { HttpError } from "./HttpError";
import type { TopicDetail } from "./types";

const realFetchJson = (url: string) => fetchJson(fetch, url, 1000);
const detail: TopicDetail = {
  name: "orders",
  partitions: [{ id: 0, leader: 1, replicas: [1, 2], isr: [1], startOffset: 3, endOffset: 9 }],
  config: [{ name: "cleanup.policy", value: "compact", sensitive: false }],
};

describe("getTopicDetail", () => {
  it("calls GET for the encoded topic path and returns the detail", async () => {
    server.use(
      http.get("http://localhost:8081/api/v1/topics/*", ({ request }) => {
        expect(new URL(request.url).pathname).toBe("/api/v1/topics/orders%20%26%20audit");
        return HttpResponse.json({ ...detail, name: "orders & audit" });
      }),
    );

    await expect(getTopicDetail(realFetchJson, "http://localhost:8081", "orders & audit")).resolves.toEqual({
      ...detail,
      name: "orders & audit",
    });
  });

  it("ignores a trailing slash in the gateway URL", async () => {
    server.use(http.get("http://localhost:8081/api/v1/topics/orders", () => HttpResponse.json(detail)));

    await expect(getTopicDetail(realFetchJson, "http://localhost:8081/", "orders")).resolves.toEqual(detail);
  });

  it("rejects with HttpError when the topic is missing", async () => {
    server.use(http.get("http://localhost:8081/api/v1/topics/orders", () => new HttpResponse(null, { status: 404 })));

    await expect(getTopicDetail(realFetchJson, "http://localhost:8081", "orders")).rejects.toBeInstanceOf(HttpError);
  });
});
