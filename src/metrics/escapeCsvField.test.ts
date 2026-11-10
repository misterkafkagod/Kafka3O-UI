import { describe, expect, it } from "vitest";
import { escapeCsvField } from "./escapeCsvField";

describe("escapeCsvField", () => {
  it("leaves plain fields alone and quotes the rest", () => {
    expect(escapeCsvField("/var/lib/kafka/data")).toBe("/var/lib/kafka/data");
    expect(escapeCsvField('a,"b"\nc')).toBe('"a,""b""\nc"');
  });
});
