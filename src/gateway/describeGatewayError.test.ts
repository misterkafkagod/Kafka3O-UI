import { describe, expect, it } from "vitest";
import { describeGatewayError } from "./describeGatewayError";
import { HttpError } from "./HttpError";

const gatewayUrl = "https://gateway.example";

describe("describeGatewayError", () => {
  it("describes rejected gateway credentials", () => {
    expect(describeGatewayError(new HttpError(401, "unauthorized"), gatewayUrl)).toEqual({
      title: "Authentication required",
      detail: "Enter or update this gateway's token.",
    });
  });
  it("describes a network failure as Gateway unreachable", () => {
    expect(describeGatewayError(new TypeError("Failed to fetch"), gatewayUrl)).toEqual({
      title: "Gateway unreachable",
      detail: "The browser cannot determine the cause. Check the network connection, gateway availability and CORS settings. For HTTPS, verify the gateway's certificate is trusted by this browser.",
    });
  });

  it("does not mention certificate trust for an HTTP gateway", () => {
    const description = describeGatewayError(new TypeError("Failed to fetch"), "http://gateway.example");
    expect(description.title).toBe("Gateway unreachable");
    expect(description.detail).toContain("cannot determine the cause");
    expect(description.detail).not.toContain("certificate");
  });

  it("describes a cluster_unreachable problem with its detail", () => {
    const error = new HttpError(503, "GET failed with 503", { code: "cluster_unreachable", detail: "dial tcp: refused" });

    expect(describeGatewayError(error, gatewayUrl)).toEqual({ title: "Cluster unreachable", detail: "dial tcp: refused" });
  });

  it("describes anything else as Something went wrong with the error message", () => {
    expect(describeGatewayError(new HttpError(500, "GET failed with 500"), gatewayUrl)).toEqual({
      title: "Something went wrong",
      detail: "GET failed with 500",
    });
  });

  it("shows a validation problem detail for an invalid position", () => {
    const error = new HttpError(400, "GET failed with 400", {
      code: "invalid_position",
      detail: "partition 9 does not exist",
    });

    expect(describeGatewayError(error, gatewayUrl)).toEqual({
      title: "Something went wrong",
      detail: "partition 9 does not exist",
    });
  });
});
