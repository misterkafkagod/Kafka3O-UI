import { type Appearance, appearanceStorageKey, type AppearanceStorage } from "./Appearance";
import { parseAppearance } from "./parseAppearance";

export function loadAppearance(storage: AppearanceStorage | null): Appearance {
  try {
    return parseAppearance(storage ? storage.getItem(appearanceStorageKey) : null);
  } catch {
    return parseAppearance(null);
  }
}
