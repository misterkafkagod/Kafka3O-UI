import { describe, expect, it } from "vitest";
import { formatAge } from "./formatAge";

describe("formatAge", () => {
  it("uses the largest whole unit", () => {
    const now = "2026-11-11T05:00:00Z";
    expect(formatAge("2026-11-11T05:00:00Z", now)).toBe("0 seconds");
    expect(formatAge("2026-11-11T04:59:59Z", now)).toBe("1 second");
    expect(formatAge("2026-11-11T04:58:30Z", now)).toBe("1 minute");
    expect(formatAge("2026-11-11T03:30:30Z", now)).toBe("1 hour");
    expect(formatAge("2026-11-09T04:00:00Z", now)).toBe("2 days");
  });

  it("treats a time after now as no age", () => {
    expect(formatAge("2026-11-11T05:00:10Z", "2026-11-11T05:00:00Z")).toBe("0 seconds");
  });
});
