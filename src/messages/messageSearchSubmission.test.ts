import { describe, expect, it } from "vitest";
import { messageSearchSubmission } from "./messageSearchSubmission";

describe("messageSearchSubmission", () => {
  it("rejects empty text and clears a previous query", () => {
    expect(messageSearchSubmission("", "old")).toEqual({ query: undefined, invalid: true, repeat: false });
  });

  it("submits a new query or repeats the same query", () => {
    expect(messageSearchSubmission("new", "old")).toEqual({ query: "new", invalid: false, repeat: false });
    expect(messageSearchSubmission("new", "new")).toEqual({ query: "new", invalid: false, repeat: true });
  });
});
