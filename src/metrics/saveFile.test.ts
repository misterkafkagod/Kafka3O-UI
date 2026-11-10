import { afterEach, describe, expect, it, vi } from "vitest";
import { saveFile } from "./saveFile";

describe("saveFile", () => {
  afterEach(() => vi.restoreAllMocks());

  it("clicks a temporary download link for a Blob and releases its URL", async () => {
    const created: Blob[] = [];
    URL.createObjectURL = vi.fn((blob: Blob) => { created.push(blob); return "blob:metrics"; });
    URL.revokeObjectURL = vi.fn();
    const clicks: { href: string; download: string }[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      clicks.push({ href: this.href, download: this.download });
    });

    saveFile("kafka-a-metrics.csv", "text/csv", "metric\r\n");

    expect(clicks).toEqual([{ href: "blob:metrics", download: "kafka-a-metrics.csv" }]);
    expect(created[0].type).toBe("text/csv");
    expect(await created[0].text()).toBe("metric\r\n");
    expect(document.querySelector("a[download]")).toBeNull();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:metrics");
  });
});
