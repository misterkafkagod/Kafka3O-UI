import { delay, http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../test/server";
import { fetchJson } from "./fetchJson";
import { HttpError } from "./HttpError";

const url = "http://gateway.test/api/v1/cluster";

describe("fetchJson", () => {
  it("returns the parsed JSON body on 2xx", async () => {
    server.use(http.get(url, () => HttpResponse.json({ clusterId: "abc" })));

    await expect(fetchJson(fetch, url, 1000)).resolves.toEqual({ clusterId: "abc" });
  });

  it("throws HttpError with the status on non-2xx", async () => {
    server.use(http.get(url, () => new HttpResponse(null, { status: 404 })));

    const error = await fetchJson(fetch, url, 1000).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(404);
  });

  it("attaches the problem code and detail from an error body", async () => {
    server.use(
      http.get(url, () =>
        HttpResponse.json(
          { title: "Cluster unreachable", code: "cluster_unreachable", detail: "Kafka is unreachable: refused" },
          { status: 503, headers: { "Content-Type": "application/problem+json" } },
        ),
      ),
    );

    const error = (await fetchJson(fetch, url, 1000).catch((e: unknown) => e)) as HttpError;

    expect(error.status).toBe(503);
    expect(error.problem).toEqual({ code: "cluster_unreachable", detail: "Kafka is unreachable: refused" });
  });

  it("leaves the problem empty when the error body is missing", async () => {
    server.use(http.get(url, () => new HttpResponse(null, { status: 503 })));

    const error = (await fetchJson(fetch, url, 1000).catch((e: unknown) => e)) as HttpError;

    expect(error.problem).toBeUndefined();
  });

  it("leaves the problem empty when the error body is not JSON", async () => {
    server.use(http.get(url, () => HttpResponse.text("Bad Gateway", { status: 502 })));

    const error = (await fetchJson(fetch, url, 1000).catch((e: unknown) => e)) as HttpError;

    expect(error.problem).toBeUndefined();
  });

  it("throws when the body is not JSON", async () => {
    server.use(http.get(url, () => HttpResponse.html("<!doctype html><html></html>")));

    await expect(fetchJson(fetch, url, 1000)).rejects.toThrow();
  });

  it("throws when the response takes longer than the timeout", async () => {
    server.use(
      http.get(url, async () => {
        await delay(500);
        return HttpResponse.json({});
      }),
    );

    await expect(fetchJson(fetch, url, 20)).rejects.toThrow();
  });
});
