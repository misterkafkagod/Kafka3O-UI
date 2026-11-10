import { describe, expect, it } from "vitest";
import { ProductionChangeCanceled } from "../console/ProductionChangeCanceled";
import { describeConnectorActionError } from "./describeConnectorActionError";
import { HttpError } from "./HttpError";

describe("describeConnectorActionError", () => {
  it("explains each failure", () => {
    expect(describeConnectorActionError(new ProductionChangeCanceled())).toBe("Canceled; nothing was sent.");
    for (const code of ["connect_action_unknown", "gateway_outcome_unknown", "outcome_unknown"]) {
      expect(describeConnectorActionError(new HttpError(503, "unknown", { code }))).toBe("The action may have been applied. Refresh before retrying.");
    }
    expect(describeConnectorActionError(new HttpError(403, "denied", { code: "forbidden", detail: "Not permitted: production_admin_required" })))
      .toBe("This is a Production cluster: only an ADMIN for it may change it.");
    expect(describeConnectorActionError(new HttpError(404, "missing", { code: "not_found" }))).toBe("The connector or task no longer exists. Refresh the list.");
    expect(describeConnectorActionError(new HttpError(409, "rejected", { code: "connect_rejected" }))).toBe("Kafka Connect rejected the action. Refresh and try again.");
    expect(describeConnectorActionError(new HttpError(404, "none", { code: "connect_not_configured" }))).toBe("Kafka Connect is not configured for this cluster.");
    expect(describeConnectorActionError(new HttpError(503, "down", { code: "connect_unreachable" }))).toBe("Kafka Connect could not be reached. Try again.");
    expect(describeConnectorActionError(new TypeError("fetch failed"))).toBe("Kafka Connect could not be reached. Try again.");
  });
});
