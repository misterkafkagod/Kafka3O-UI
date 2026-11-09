import { describe, expect, it } from "vitest";
import { defaultAppearance } from "./Appearance";
import { parseAppearance } from "./parseAppearance";

describe("parseAppearance", () => {
  it("reads a complete stored appearance", () => {
    const stored = { mode: "dark", theme: "teal", font: "hyperlegible", textSize: "large", density: "compact" };
    expect(parseAppearance(JSON.stringify(stored))).toEqual(stored);
  });

  it("keeps valid fields and defaults unknown or malformed ones", () => {
    expect(parseAppearance(JSON.stringify({ mode: "light", theme: "purple", font: 3, textSize: "huge", extra: "x" }))).toEqual({
      ...defaultAppearance,
      mode: "light",
    });
  });

  it("falls back to the defaults for missing, broken or non-object values", () => {
    for (const stored of [null, "", "{", "null", "[]", "\"dark\"", "42"]) {
      expect(parseAppearance(stored), String(stored)).toEqual(defaultAppearance);
    }
  });
});
