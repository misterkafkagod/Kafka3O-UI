import { type Appearance, appearanceStorageKey, type AppearanceStorage } from "./Appearance";

// saveAppearance stores the five choices, or removes the entry when appearance is null, and reports success.
export function saveAppearance(storage: AppearanceStorage | null, appearance: Appearance | null): boolean {
  if (!storage) return false;
  try {
    if (appearance === null) {
      storage.removeItem(appearanceStorageKey);
    } else {
      const { mode, theme, font, textSize, density } = appearance;
      storage.setItem(appearanceStorageKey, JSON.stringify({ mode, theme, font, textSize, density }));
    }
    return true;
  } catch {
    return false;
  }
}
