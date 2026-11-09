import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(process.cwd(), "src/appearance/typography.css"), "utf8");

function rule(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`Missing rule ${selector}`);
  return css.slice(start, css.indexOf("}", start));
}

describe("typography preferences", () => {
  it("loads the bundled font only from the UI origin", () => {
    const urls = [...css.matchAll(/url\("([^"]+)"\)/g)].map((match) => match[1]);
    expect(urls).toEqual(["./fonts/atkinson-hyperlegible-latin-400-normal.woff2", "./fonts/atkinson-hyperlegible-latin-700-normal.woff2"]);
    for (const url of urls) expect(readFileSync(resolve(process.cwd(), "src/appearance", url)).subarray(0, 4).toString("latin1")).toBe("wOF2");
    expect(css.match(/font-display: swap;/g)).toHaveLength(2);
    expect(readFileSync(resolve(process.cwd(), "src/appearance/fonts/OFL.txt"), "utf8")).toContain("SIL Open Font License, Version 1.1");
  });

  it("selects each font and keeps a system fallback", () => {
    expect(rule(':root[data-font="hyperlegible"]')).toMatch(/font-family: "Atkinson Hyperlegible", .*sans-serif;/);
    expect(rule(':root[data-font="serif"]')).toMatch(/font-family: .*serif;/);
  });

  it("scales the root text size", () => {
    expect(rule(':root[data-text-size="small"]')).toContain("font-size: 87.5%;");
    expect(rule(':root[data-text-size="large"]')).toContain("font-size: 112.5%;");
    expect(rule(':root[data-text-size="extra-large"]')).toContain("font-size: 125%;");
  });
});
