import { describe, expect, it } from "vitest";
import { readRestoreFilter } from "./readRestoreFilter";

const local = (text: string) => new Date(text).toISOString();

describe("readRestoreFilter", () => {
  it("reads a time range as UTC", () => {
    expect(readRestoreFilter({ from: "2026-11-11T01:00", to: "2026-11-11T02:30", partitions: "" }))
      .toEqual({ selection: { from: local("2026-11-11T01:00"), to: local("2026-11-11T02:30") } });
  });

  it("reads partitions, sorted and distinct", () => {
    expect(readRestoreFilter({ from: "", to: "", partitions: " 2, 0,2 " })).toEqual({ selection: { partitions: [0, 2] } });
  });

  it("reads one bound with partitions", () => {
    expect(readRestoreFilter({ from: "2026-11-11T01:00", to: "", partitions: "1" })).toEqual({ selection: { from: local("2026-11-11T01:00"), partitions: [1] } });
  });

  it("refuses a reversed or empty range", () => {
    expect(readRestoreFilter({ from: "2026-11-11T02:00", to: "2026-11-11T01:00", partitions: "" }).error).toBe("The start time must be before the end time.");
    expect(readRestoreFilter({ from: "2026-11-11T02:00", to: "2026-11-11T02:00", partitions: "" }).error).toBe("The start time must be before the end time.");
  });

  it("refuses bad partitions and invalid times", () => {
    for (const partitions of ["a", "1,,2", "-1", "1.5", "0;1"]) {
      expect(readRestoreFilter({ from: "", to: "", partitions }).error).toBe("Partitions must be numbers separated by commas, for example 0, 2.");
    }
    expect(readRestoreFilter({ from: "soon", to: "", partitions: "" }).error).toBe("Enter a valid start time.");
  });

  it("asks for a selection when nothing is chosen", () => {
    expect(readRestoreFilter({ from: " ", to: "", partitions: "" }).error).toBe("Choose a time range or partitions, or restore everything.");
  });
});
