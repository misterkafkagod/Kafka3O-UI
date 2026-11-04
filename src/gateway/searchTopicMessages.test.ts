import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../test/server";
import { fetchJson } from "./fetchJson";
import { HttpError } from "./HttpError";
import { searchTopicMessages } from "./searchTopicMessages";
import type { TopicMessageSearchResult } from "./types";

const realFetchJson = (url: string) => fetchJson(fetch, url, 1000);
const result: TopicMessageSearchResult = { messages: [], scanned: 500, truncated: true };

describe("searchTopicMessages", () => {
  it("encodes the topic and query and returns the search result", async () => {
    server.use(
      http.get("http://localhost:8081/api/v1/topics/*/messages/search", ({ request }) => {
        const url = new URL(request.url);
        expect(url.pathname).toBe("/api/v1/topics/orders%20%26%20audit/messages/search");
        expect(url.searchParams.get("query")).toBe("café & order+");
        return HttpResponse.json(result);
      }),
    );

    await expect(searchTopicMessages(realFetchJson, "http://localhost:8081/", "orders & audit", "café & order+")).resolves.toEqual(result);
  });

  it("propagates gateway errors", async () => {
    server.use(
      http.get("http://localhost:8081/api/v1/topics/orders/messages/search", () => new HttpResponse(null, { status: 503 })),
    );

    await expect(searchTopicMessages(realFetchJson, "http://localhost:8081", "orders", "x")).rejects.toBeInstanceOf(HttpError);
  });
});
