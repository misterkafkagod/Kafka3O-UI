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
