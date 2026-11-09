// contrastRatio returns the WCAG 2.x contrast ratio of two #rrggbb colors.
export function contrastRatio(first: string, second: string): number {
  const luminance = [first, second].map((color) => {
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) throw new Error(`Unsupported color "${color}"`);
    const [red, green, blue] = [1, 3, 5].map((start) => {
      const channel = parseInt(color.slice(start, start + 2), 16) / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  });
  const [lighter, darker] = luminance[0] >= luminance[1] ? luminance : [luminance[1], luminance[0]];
  return (lighter + 0.05) / (darker + 0.05);
}
