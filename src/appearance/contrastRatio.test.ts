import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrastRatio";

describe("contrastRatio", () => {
  it("computes WCAG ratios in either order", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21, 5);
    expect(contrastRatio("#1d4ed8", "#1d4ed8")).toBe(1);
    expect(contrastRatio("#767676", "#ffffff")).toBeCloseTo(4.54, 2);
  });

  it("rejects colors it cannot measure", () => {
    for (const color of ["#fff", "rgb(0,0,0)", "white", "#12345g"]) {
      expect(() => contrastRatio(color, "#ffffff"), color).toThrow("Unsupported color");
    }
  });
});
