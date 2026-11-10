import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../test/server";
import { fetchJson } from "./fetchJson";
import { HttpError } from "./HttpError";
import { previewOffsetReset } from "./previewOffsetReset";

const realFetchJson = (url: string) => fetchJson(fetch, url, 1000);
const preview = { group: "team/billing", topic: "orders", partitions: [{ partition: 0, currentOffset: "9007199254740993", targetOffset: "0" }] };

describe("previewOffsetReset", () => {
  it("asks for the encoded group with the topic and target", async () => {
    server.use(http.get("http://localhost:8081/api/v1/consumer-groups/*", ({ request }) => {
      const url = new URL(request.url);
      expect(url.pathname).toBe("/api/v1/consumer-groups/team%2Fbilling/offset-reset");
      expect(Object.fromEntries(url.searchParams)).toEqual({ topic: "orders & audit", target: "timestamp", timestamp: "1700000000000" });
      return HttpResponse.json(preview);
    }));

    await expect(previewOffsetReset(realFetchJson, "http://localhost:8081/", "team/billing", "orders & audit",
      { kind: "timestamp", timestamp: 1700000000000 })).resolves.toEqual(preview);
  });

  it("sends no timestamp for earliest and latest", async () => {
    server.use(http.get("http://localhost:8081/api/v1/consumer-groups/billing/offset-reset", ({ request }) => {
      expect(new URL(request.url).searchParams.has("timestamp")).toBe(false);
      return HttpResponse.json(preview);
    }));

    await previewOffsetReset(realFetchJson, "http://localhost:8081", "billing", "orders", { kind: "earliest" });
  });

  it("rejects with the HTTP status for an active group", async () => {
    server.use(http.get("http://localhost:8081/api/v1/consumer-groups/billing/offset-reset", () =>
      HttpResponse.json({ code: "group_active", detail: "Stop the group's consumers first" }, { status: 409 })));

    await expect(previewOffsetReset(realFetchJson, "http://localhost:8081", "billing", "orders", { kind: "latest" }))
      .rejects.toMatchObject({ status: 409 } satisfies Partial<HttpError>);
  });
});
