import { describe, expect, it } from "vitest";
import { describeGatewayTransportFailure } from "./describeGatewayTransportFailure";

describe("describeGatewayTransportFailure", () => {
  it("explains the uncertain cause and HTTPS certificate checks", () => {
    const detail = describeGatewayTransportFailure("https://gateway.example");
    expect(detail).toContain("cannot determine the cause");
    expect(detail).toContain("network");
    expect(detail).toContain("gateway");
    expect(detail).toContain("CORS");
    expect(detail).toContain("certificate is trusted");
  });

  it("does not suggest certificate checks for HTTP", () => {
    expect(describeGatewayTransportFailure("http://gateway.example")).not.toContain("certificate");
  });
});
