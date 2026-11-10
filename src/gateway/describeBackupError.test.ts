import { describe, expect, it } from "vitest";
import { ProductionChangeCanceled } from "../console/ProductionChangeCanceled";
import { describeBackupError } from "./describeBackupError";
import { HttpError } from "./HttpError";

describe("describeBackupError", () => {
  it("explains each failure", () => {
    expect(describeBackupError(new ProductionChangeCanceled())).toBe("Canceled; nothing was sent.");
    expect(describeBackupError(new HttpError(409, "exists", { code: "backup_exists" }))).toBe("This topic is already backed up.");
    expect(describeBackupError(new HttpError(404, "gone", { code: "not_found" }))).toBe("This topic no longer has a backup. Refresh the list.");
    expect(describeBackupError(new HttpError(404, "none", { code: "backups_not_configured" }))).toBe("Backups are not configured for this cluster.");
    expect(describeBackupError(new HttpError(400, "bad", { code: "invalid_topic" }))).toBe("Choose a valid topic.");
    expect(describeBackupError(new HttpError(409, "rejected", { code: "connect_rejected" }))).toBe("Kafka Connect rejected the backup. Check the Connect tab and try again.");
    expect(describeBackupError(new HttpError(503, "unknown", { code: "connect_action_unknown" }))).toBe("The change may have been applied. Refresh before retrying.");
    expect(describeBackupError(new HttpError(403, "denied", { code: "forbidden", detail: "Not permitted: change_reason_required" }))).toBe("Production changes need a recorded change reason.");
    expect(describeBackupError(new HttpError(503, "down", { code: "connect_unreachable" }))).toBe("Kafka Connect could not be reached. Try again.");
  });
});
