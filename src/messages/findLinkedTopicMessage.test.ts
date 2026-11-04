import { describe, expect, it } from "vitest";
import type { TopicMessage } from "../gateway/types";
import { findLinkedTopicMessage } from "./findLinkedTopicMessage";

const message: TopicMessage = { partition: 2, offset: 9, timestamp: "", key: null, value: null, headers: [] };

describe("findLinkedTopicMessage", () => {
  it("finds only the requested partition and exact offset", () => {
    expect(findLinkedTopicMessage([message], { partition: 2, offset: "9" })).toEqual({ kind: "found", message });
    expect(findLinkedTopicMessage([message], { partition: 1, offset: "9" })).toEqual({ kind: "not-found" });
    expect(findLinkedTopicMessage([message], { partition: 2, offset: "8" })).toEqual({ kind: "not-found" });
  });

  it("verifies large offsets only when the gateway supplied the exact value", () => {
    const large = { ...message, offset: Number("9007199254740993"), offsetExact: "9007199254740993" };
    expect(findLinkedTopicMessage([large], { partition: 2, offset: "9007199254740993" })).toEqual({ kind: "found", message: large });
    expect(findLinkedTopicMessage([{ ...large, offsetExact: undefined }], { partition: 2, offset: "9007199254740993" })).toEqual({
      kind: "unverifiable",
    });
  });
});
