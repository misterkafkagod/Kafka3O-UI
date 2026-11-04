import { describe, expect, it } from "vitest";
import { topicMessagePositionFromForm } from "./topicMessagePositionFromForm";

describe("topicMessagePositionFromForm", () => {
  it("creates an offset request", () => {
    expect(topicMessagePositionFromForm("offset", "2", "17", "")).toEqual({ partition: 2, offset: 17 });
  });

  it("creates a timestamp request in Unix milliseconds", () => {
    expect(topicMessagePositionFromForm("timestamp", "1", "", "1700000000123")).toEqual({
      partition: 1,
      timestamp: 1700000000123,
    });
  });
});
