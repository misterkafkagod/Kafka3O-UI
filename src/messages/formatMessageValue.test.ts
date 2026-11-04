import { describe, expect, it } from "vitest";
import { formatMessageValue } from "./formatMessageValue";

describe("formatMessageValue", () => {
  it("returns the original base64 value", () => {
    expect(formatMessageValue("eyJvayI6dHJ1ZX0=", "base64")).toEqual({
      value: "eyJvayI6dHJ1ZX0=",
      invalidJson: false,
    });
  });

  it("decodes UTF-8 text", () => {
    expect(formatMessageValue("eyJ0ZXh0Ijoi4pyTIn0=", "text")).toEqual({
      value: '{"text":"✓"}',
      invalidJson: false,
    });
  });

  it("pretty-prints valid JSON", () => {
    expect(formatMessageValue("eyJvayI6dHJ1ZX0=", "json")).toEqual({
      value: '{\n  "ok": true\n}',
      invalidJson: false,
    });
  });

  it("returns decoded text and flags invalid JSON", () => {
    expect(formatMessageValue("bm90IGpzb24=", "json")).toEqual({
      value: "not json",
      invalidJson: true,
    });
  });
});
