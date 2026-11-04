import { describe, expect, it } from "vitest";
import { consumerLagStatusLabel } from "./consumerLagStatusLabel";

describe("consumerLagStatusLabel", () => {
  it("labels each offset state without treating unknown lag as zero", () => {
    expect(consumerLagStatusLabel("ok")).toBe("Available");
    expect(consumerLagStatusLabel("no_commit")).toBe("No committed offset");
    expect(consumerLagStatusLabel("out_of_range")).toBe("Commit outside log range");
    expect(consumerLagStatusLabel("unavailable")).toBe("Unavailable");
  });
});
