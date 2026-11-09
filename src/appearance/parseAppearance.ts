import { type Appearance, colorModes, colorThemes, defaultAppearance, densities, fonts, textSizes } from "./Appearance";
import { pickAllowed } from "./pickAllowed";

// parseAppearance keeps each valid stored field and falls back to the default for anything else.
export function parseAppearance(stored: string | null): Appearance {
  let value: unknown;
  try {
    value = stored === null ? null : JSON.parse(stored);
  } catch {
    value = null;
  }
  const record = typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return {
    mode: pickAllowed(colorModes, record.mode, defaultAppearance.mode),
    theme: pickAllowed(colorThemes, record.theme, defaultAppearance.theme),
    font: pickAllowed(fonts, record.font, defaultAppearance.font),
    textSize: pickAllowed(textSizes, record.textSize, defaultAppearance.textSize),
    density: pickAllowed(densities, record.density, defaultAppearance.density),
  };
}
