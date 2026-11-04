import { describe, expect, it } from "vitest";
import { topicMessageLinkPosition } from "./topicMessageLinkPosition";

describe("topicMessageLinkPosition", () => {
  it("recognizes normal pages and validates exact int64 positions", () => {
    expect(topicMessageLinkPosition(new URLSearchParams())).toEqual({ kind: "none" });
    expect(topicMessageLinkPosition(new URLSearchParams("partition=2&offset=9007199254740993"))).toEqual({
      kind: "position",
      position: { partition: 2, offset: "9007199254740993" },
    });
    expect(topicMessageLinkPosition(new URLSearchParams("partition=2147483647&offset=9223372036854775807")).kind).toBe("position");
  });

  it.each([
    "partition=1",
    "offset=1",
    "partition=-1&offset=0",
    "partition=01&offset=0",
    "partition=2147483648&offset=0",
    "partition=1&offset=-1",
    "partition=1&offset=9007199254740993.0",
    "partition=1&offset=9223372036854775808",
    "partition=1&offset=0&offset=1",
    "partition=1&offset=0&timestamp=2",
  ])("rejects malformed or ambiguous position %s", (query) => {
    expect(topicMessageLinkPosition(new URLSearchParams(query))).toEqual({ kind: "invalid" });
  });
});
