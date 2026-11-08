import { describe, expect, it } from "vitest";
import { describeEnvironment } from "./describeEnvironment";

describe("describeEnvironment", () => {
  it("labels every classification, including the write-blocking unclassified state", () => {
    expect(describeEnvironment("PRODUCTION")).toBe("Production");
    expect(describeEnvironment("NON_PRODUCTION")).toBe("Non-production");
    expect(describeEnvironment("")).toBe("Unclassified — writes blocked");
  });
});
