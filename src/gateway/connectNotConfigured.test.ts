import { describe, expect, it } from "vitest";
import { connectNotConfigured } from "./connectNotConfigured";

describe("connectNotConfigured", () => {
  it("rejects as not configured", async () => {
    await expect(connectNotConfigured()).rejects.toMatchObject({ status: 404, problem: { code: "connect_not_configured" } });
  });
});
