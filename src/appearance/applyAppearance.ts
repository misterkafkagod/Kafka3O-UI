import { type Appearance, defaultAppearance } from "./Appearance";

const attributes: Record<keyof Appearance, string> = {
  mode: "data-mode",
  theme: "data-theme",
  font: "data-font",
  textSize: "data-text-size",
  density: "data-density",
};

// applyAppearance marks the root with each non-default choice; a missing attribute means the default.
export function applyAppearance(root: HTMLElement, appearance: Appearance) {
  for (const key of Object.keys(attributes) as (keyof Appearance)[]) {
    if (appearance[key] === defaultAppearance[key]) {
      root.removeAttribute(attributes[key]);
    } else {
      root.setAttribute(attributes[key], appearance[key]);
    }
  }
}
