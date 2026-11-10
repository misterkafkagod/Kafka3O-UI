import { describe, expect, it } from "vitest";
import { isConnectStorageTopic } from "./isConnectStorageTopic";

describe("isConnectStorageTopic", () => {
  it("matches Connect storage topics only", () => {
    for (const name of ["connect-configs", "connect-offsets", "connect-status", "kafka3o-connect-configs", "team.connect.offsets"]) {
      expect(isConnectStorageTopic(name), name).toBe(true);
    }
    for (const name of ["orders", "connector-events", "kafka3o-m10-verify", "connect-configs-archive", "myconnect-status"]) {
      expect(isConnectStorageTopic(name), name).toBe(false);
    }
  });
});
