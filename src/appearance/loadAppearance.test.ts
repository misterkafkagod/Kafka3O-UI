import { describe, expect, it } from "vitest";
import { appearanceStorageKey, defaultAppearance } from "./Appearance";
import { loadAppearance } from "./loadAppearance";

describe("loadAppearance", () => {
  it("reads the stored entry", () => {
    const storage = { getItem: (key: string) => key === appearanceStorageKey ? "{\"mode\":\"dark\"}" : null, setItem: () => {}, removeItem: () => {} };
    expect(loadAppearance(storage)).toEqual({ ...defaultAppearance, mode: "dark" });
  });

  it("uses the defaults without storage or when storage throws", () => {
    const throwing = { getItem: () => { throw new Error("blocked"); }, setItem: () => {}, removeItem: () => {} };
    expect(loadAppearance(null)).toEqual(defaultAppearance);
    expect(loadAppearance(throwing)).toEqual(defaultAppearance);
  });
});
