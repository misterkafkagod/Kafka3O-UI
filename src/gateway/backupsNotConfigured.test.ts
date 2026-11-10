import { describe, expect, it } from "vitest";
import { backupsNotConfigured } from "./backupsNotConfigured";

describe("backupsNotConfigured", () => {
  it("rejects as not configured", async () => {
    await expect(backupsNotConfigured()).rejects.toMatchObject({ status: 404, problem: { code: "backups_not_configured" } });
  });
});
