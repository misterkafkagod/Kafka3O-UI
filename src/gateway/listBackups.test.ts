import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../test/server";
import { fetchJson } from "./fetchJson";
import { listBackups } from "./listBackups";

const realFetchJson = (url: string) => fetchJson(fetch, url, 1000);

describe("listBackups", () => {
  it("reads the cluster's backups", async () => {
    const backups = [{ topic: "orders", connector: "kafka3o-backup-orders", location: "s3://b/kafka-a/orders/", state: "RUNNING",
      storage: { objects: 2, storedBytes: 385, lastWrite: "2026-11-10T08:01:00Z" } }];
    server.use(http.get("http://localhost:8081/api/v1/backups", () => HttpResponse.json({ backups })));
    await expect(listBackups(realFetchJson, "http://localhost:8081/")).resolves.toEqual(backups);
  });

  it("rejects an invalid response and passes on problems", async () => {
    server.use(http.get("http://localhost:8081/api/v1/backups", () => HttpResponse.json([])));
    await expect(listBackups(realFetchJson, "http://localhost:8081")).rejects.toThrow("invalid backup list");
    server.use(http.get("http://localhost:8081/api/v1/backups", () => HttpResponse.json({ code: "backups_not_configured" }, { status: 404 })));
    await expect(listBackups(realFetchJson, "http://localhost:8081")).rejects.toMatchObject({ status: 404, problem: { code: "backups_not_configured" } });
  });
});
