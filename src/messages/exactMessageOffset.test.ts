import { describe, expect, it } from "vitest";
import type { TopicMessage } from "../gateway/types";
import { exactMessageOffset } from "./exactMessageOffset";

const message: TopicMessage = { partition: 0, offset: 7, timestamp: "", key: null, value: null, headers: [] };

describe("exactMessageOffset", () => {
  it("uses safe legacy offsets and exact strings for large offsets", () => {
    expect(exactMessageOffset(message)).toBe("7");
    expect(exactMessageOffset({ ...message, offset: Number("9007199254740993"), offsetExact: "9007199254740993" })).toBe(
      "9007199254740993",
    );
    expect(exactMessageOffset({ ...message, offset: Number("9223372036854775807"), offsetExact: "9223372036854775807" })).toBe(
      "9223372036854775807",
    );
  });

  it("rejects unsafe legacy offsets and invalid or inconsistent exact strings", () => {
    expect(exactMessageOffset({ ...message, offset: Number("9007199254740993") })).toBeUndefined();
    expect(exactMessageOffset({ ...message, offsetExact: "07" })).toBeUndefined();
    expect(exactMessageOffset({ ...message, offsetExact: "8" })).toBeUndefined();
    expect(exactMessageOffset({ ...message, offset: Number("9223372036854775808"), offsetExact: "9223372036854775808" })).toBeUndefined();
    expect(exactMessageOffset({ ...message, offset: -1 })).toBeUndefined();
  });
});
