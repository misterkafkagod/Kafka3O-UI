import { describe, expect, it } from "vitest";
import { classifyGatewayError } from "./classifyGatewayError";
import { HttpError } from "./HttpError";

describe("classifyGatewayError", () => {
  it("treats a fetch network failure (TypeError) as gateway-unreachable", () => {
    expect(classifyGatewayError(new TypeError("Failed to fetch"))).toBe("gateway-unreachable");
  });

  it("treats a timeout as gateway-unreachable", () => {
    expect(classifyGatewayError(new DOMException("timed out", "TimeoutError"))).toBe("gateway-unreachable");
  });

  it("treats an abort as gateway-unreachable", () => {
    expect(classifyGatewayError(new DOMException("aborted", "AbortError"))).toBe("gateway-unreachable");
  });

  it("treats an HTTP error as other", () => {
    expect(classifyGatewayError(new HttpError(500, "GET failed with 500"))).toBe("other");
  });

  it("treats a plain Error and non-errors as other", () => {
    expect(classifyGatewayError(new Error("boom"))).toBe("other");
    expect(classifyGatewayError(null)).toBe("other");
    expect(classifyGatewayError("text")).toBe("other");
  });
});
