import { describe, expect, it } from "vitest";
import { produceMessageFromForm } from "./produceMessageFromForm";

describe("produceMessageFromForm", () => {
  it("preserves empty fields while omitting an unchecked key and UI-only header ids", () => {
    const headers = [{ id: 1, key: "", value: "" }];
    expect(produceMessageFromForm("", false, "", headers)).toEqual({ value: "", headers: [{ key: "", value: "" }] });
    expect(produceMessageFromForm("", true, "", headers)).toEqual({ value: "", key: "", headers: [{ key: "", value: "" }] });
  });
});
