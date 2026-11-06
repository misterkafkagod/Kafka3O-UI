import { describe, expect, it } from "vitest";
import { restoreDialogFocus } from "./restoreDialogFocus";

describe("restoreDialogFocus", () => {
  it("returns focus to the invoker, or to the fallback when the invoker is unavailable", () => {
    const opener = document.createElement("button");
    const fallback = document.createElement("button");
    document.body.append(opener, fallback);

    restoreDialogFocus(opener, fallback);
    expect(document.activeElement).toBe(opener);
    opener.remove();
    restoreDialogFocus(opener, fallback);
    expect(document.activeElement).toBe(fallback);
    fallback.remove();
  });
});
