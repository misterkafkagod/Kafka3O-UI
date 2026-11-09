export const colorModes = ["system", "light", "dark"] as const;
export const colorThemes = ["blue", "slate", "teal", "high-contrast"] as const;
export const fonts = ["system", "hyperlegible", "serif"] as const;
export const textSizes = ["small", "default", "large", "extra-large"] as const;
export const densities = ["comfortable", "compact"] as const;

export type Appearance = {
  mode: (typeof colorModes)[number];
  theme: (typeof colorThemes)[number];
  font: (typeof fonts)[number];
  textSize: (typeof textSizes)[number];
  density: (typeof densities)[number];
};

export const defaultAppearance: Appearance = {
  mode: "system",
  theme: "blue",
  font: "system",
  textSize: "default",
  density: "comfortable",
};

// The single browser-storage entry; it holds only these five appearance choices.
export const appearanceStorageKey = "kafka3o.appearance.v1";

// AppearanceStorage is the part of the Web Storage API the appearance code uses; any call may throw.
export type AppearanceStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
