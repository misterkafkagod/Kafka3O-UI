import { describe, expect, it, vi } from "vitest";
import { appearanceStorageKey, defaultAppearance } from "./Appearance";
import { saveAppearance } from "./saveAppearance";

describe("saveAppearance", () => {
  it("writes only the five appearance choices", () => {
    const storage = { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() };
    const extended = { ...defaultAppearance, mode: "dark" as const, username: "admin" };
    expect(saveAppearance(storage, extended)).toBe(true);
    expect(storage.setItem).toHaveBeenCalledWith(appearanceStorageKey,
      JSON.stringify({ mode: "dark", theme: "blue", font: "system", textSize: "default", density: "comfortable" }));
  });

  it("removes the entry on reset", () => {
    const storage = { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() };
    expect(saveAppearance(storage, null)).toBe(true);
    expect(storage.removeItem).toHaveBeenCalledWith(appearanceStorageKey);
  });

  it("reports failure when storage is missing or throws", () => {
    const throwing = { getItem: vi.fn(), setItem: () => { throw new Error("quota"); }, removeItem: () => { throw new Error("blocked"); } };
    expect(saveAppearance(null, defaultAppearance)).toBe(false);
    expect(saveAppearance(throwing, defaultAppearance)).toBe(false);
    expect(saveAppearance(throwing, null)).toBe(false);
  });
});
