import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../test/server";
import { fetchJson } from "./fetchJson";
import { HttpError } from "./HttpError";
import { listLatestTopicMessages } from "./listLatestTopicMessages";
import type { TopicMessage } from "./types";

const realFetchJson = (url: string) => fetchJson(fetch, url, 1000);
const messages: TopicMessage[] = [
  {
    partition: 1,
    offset: 7,
    timestamp: "2026-01-02T03:04:05Z",
    key: "b3JkZXItMQ==",
    value: "Y3JlYXRlZA==",
    headers: [{ key: "source", value: "YXBp" }],
  },
];

describe("listLatestTopicMessages", () => {
  it("calls GET for the encoded topic path and returns messages", async () => {
    server.use(
      http.get("http://localhost:8081/api/v1/topics/*/messages", ({ request }) => {
        expect(new URL(request.url).pathname).toBe("/api/v1/topics/orders%20%26%20audit/messages");
        return HttpResponse.json(messages);
      }),
    );

    await expect(listLatestTopicMessages(realFetchJson, "http://localhost:8081", "orders & audit")).resolves.toEqual(messages);
  });

  it("ignores a trailing slash in the gateway URL", async () => {
    server.use(http.get("http://localhost:8081/api/v1/topics/orders/messages", () => HttpResponse.json(messages)));

    await expect(listLatestTopicMessages(realFetchJson, "http://localhost:8081/", "orders")).resolves.toEqual(messages);
  });

  it("encodes offset and timestamp position queries", async () => {
    const urls: string[] = [];
    server.use(
      http.get("http://localhost:8081/api/v1/topics/orders/messages", ({ request }) => {
        urls.push(request.url);
        return HttpResponse.json(messages);
      }),
    );

    await listLatestTopicMessages(realFetchJson, "http://localhost:8081", "orders", { partition: 2, offset: 17 });
    await listLatestTopicMessages(realFetchJson, "http://localhost:8081", "orders", {
      partition: 1,
      timestamp: 1700000000123,
    });

    expect(urls).toEqual([
      "http://localhost:8081/api/v1/topics/orders/messages?partition=2&offset=17",
      "http://localhost:8081/api/v1/topics/orders/messages?partition=1&timestamp=1700000000123",
    ]);
  });

  it("preserves an exact large offset in the query string", async () => {
    server.use(
      http.get("http://localhost:8081/api/v1/topics/orders/messages", ({ request }) => {
        expect(new URL(request.url).searchParams.get("offset")).toBe("9007199254740993");
        return HttpResponse.json(messages);
      }),
    );
    await listLatestTopicMessages(realFetchJson, "http://localhost:8081", "orders", {
      partition: 2,
      offset: "9007199254740993",
    });
  });

  it("rejects with HttpError when the topic is missing", async () => {
    server.use(
      http.get("http://localhost:8081/api/v1/topics/orders/messages", () => new HttpResponse(null, { status: 404 })),
    );

    await expect(listLatestTopicMessages(realFetchJson, "http://localhost:8081", "orders")).rejects.toBeInstanceOf(HttpError);
  });
});
