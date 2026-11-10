import { describe, expect, it } from "vitest";
import { formatBytes } from "./formatBytes";

describe("formatBytes", () => {
  it("uses binary units", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1023)).toBe("1023 B");
    expect(formatBytes(3072)).toBe("3.0 KB");
    expect(formatBytes(5 * 1024 ** 3)).toBe("5.0 GB");
  });
});
