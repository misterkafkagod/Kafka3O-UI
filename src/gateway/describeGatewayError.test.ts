import { describe, expect, it } from "vitest";
import { describeGatewayError } from "./describeGatewayError";
import { HttpError } from "./HttpError";

describe("describeGatewayError", () => {
  it("describes a network failure as Gateway unreachable", () => {
    expect(describeGatewayError(new TypeError("Failed to fetch"))).toEqual({ title: "Gateway unreachable" });
  });

  it("describes a cluster_unreachable problem with its detail", () => {
    const error = new HttpError(503, "GET failed with 503", { code: "cluster_unreachable", detail: "dial tcp: refused" });

    expect(describeGatewayError(error)).toEqual({ title: "Cluster unreachable", detail: "dial tcp: refused" });
  });

  it("describes anything else as Something went wrong with the error message", () => {
    expect(describeGatewayError(new HttpError(500, "GET failed with 500"))).toEqual({
      title: "Something went wrong",
      detail: "GET failed with 500",
    });
  });
});
