import { describe, expect, it } from "vitest";
import { defaultAppearance } from "./Appearance";
import { applyAppearance } from "./applyAppearance";

describe("applyAppearance", () => {
  it("marks non-default choices and removes defaults", () => {
    const root = document.createElement("html");
    applyAppearance(root, { mode: "dark", theme: "slate", font: "serif", textSize: "extra-large", density: "compact" });
    expect([root.dataset.mode, root.dataset.theme, root.dataset.font, root.dataset.textSize, root.dataset.density])
      .toEqual(["dark", "slate", "serif", "extra-large", "compact"]);
    applyAppearance(root, defaultAppearance);
    expect(root.getAttributeNames()).toEqual([]);
  });
});
