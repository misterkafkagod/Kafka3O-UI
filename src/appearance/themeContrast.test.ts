import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { colorThemes } from "./Appearance";
import { contrastRatio } from "./contrastRatio";

const stylesheets = {
  base: readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8"),
  themes: readFileSync(resolve(process.cwd(), "src/appearance/themes.css"), "utf8"),
};
const tokenNames = ["canvas", "surface", "surface-subtle", "text", "text-muted", "border", "border-subtle", "link", "primary",
  "primary-contrast", "alert-text", "alert-surface", "focus", "status-good"];

// tokensAfter reads the --color-* declarations of the rule whose selector ends exactly at the given header.
function tokensAfter(css: string, header: string): Record<string, string> {
  const start = css.indexOf(`${header} {`);
  if (start < 0) throw new Error(`Missing rule ${header}`);
  const body = css.slice(start, css.indexOf("}", start));
  return Object.fromEntries([...body.matchAll(/--color-([a-z-]+):\s*(#[0-9a-fA-F]{6});/g)].map((match) => [match[1], match[2]]));
}

function themeRules(theme: (typeof colorThemes)[number]) {
  if (theme === "blue") {
    return {
      light: tokensAfter(stylesheets.base, ':root,\n:root[data-mode="light"]'),
      systemDark: tokensAfter(stylesheets.base, '  :root:not([data-mode="light"])'),
      dark: tokensAfter(stylesheets.base, ':root[data-mode="dark"]'),
    };
  }
  return {
    light: tokensAfter(stylesheets.themes, `:root[data-theme="${theme}"],\n:root[data-theme="${theme}"][data-mode="light"]`),
    systemDark: tokensAfter(stylesheets.themes, `  :root[data-theme="${theme}"]:not([data-mode="light"])`),
    dark: tokensAfter(stylesheets.themes, `:root[data-theme="${theme}"][data-mode="dark"]`),
  };
}

const textPairs = [
  ...["text", "text-muted", "link"].flatMap((foreground) => ["canvas", "surface", "surface-subtle"].map((background) => [foreground, background])),
  ["primary-contrast", "primary"], ["alert-text", "alert-surface"], ["status-good", "surface"], ["status-good", "surface-subtle"],
];
const boundaryPairs = [
  ...["border", "focus", "primary"].flatMap((foreground) => ["canvas", "surface", "surface-subtle"].map((background) => [foreground, background])),
  ["alert-text", "surface"],
];

describe("theme contrast", () => {
  for (const theme of colorThemes) {
    const rules = themeRules(theme);
    it(`${theme} defines every token and matches system dark to forced dark`, () => {
      for (const tokens of [rules.light, rules.dark]) expect(Object.keys(tokens).sort()).toEqual([...tokenNames].sort());
      expect(rules.systemDark).toEqual(rules.dark);
    });
    for (const [mode, tokens] of [["light", rules.light], ["dark", rules.dark]] as const) {
      it(`${theme} ${mode} meets the contrast thresholds`, () => {
        const textMinimum = theme === "high-contrast" ? 7 : 4.5;
        for (const [foreground, background] of textPairs) {
          expect(contrastRatio(tokens[foreground], tokens[background]), `${foreground} on ${background}`).toBeGreaterThanOrEqual(textMinimum);
        }
        for (const [foreground, background] of boundaryPairs) {
          expect(contrastRatio(tokens[foreground], tokens[background]), `${foreground} against ${background}`).toBeGreaterThanOrEqual(3);
        }
      });
    }
  }
});
