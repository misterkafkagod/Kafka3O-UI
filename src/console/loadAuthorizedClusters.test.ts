import { describe, expect, it, vi } from "vitest";
import { loadAuthorizedClusters } from "./loadAuthorizedClusters";

describe("loadAuthorizedClusters", () => {
  it("maps authorized clusters to same-origin forwarding bases", async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => Response.json({ clusters: [
      { id: "dev", name: "Dev", environment: "NON_PRODUCTION", effectiveRole: "OPERATOR" },
    ] }));
    await expect(loadAuthorizedClusters(fetchFn, "https://console.example", () => {})).resolves.toEqual([
      { id: "dev", name: "Dev", url: "https://console.example/api/clusters/dev/gateway" },
    ]);
    expect(fetchFn.mock.calls[0][1]?.credentials).toBe("same-origin");
  });

  it("ends the session on 401 and rejects malformed or path-like cluster IDs", async () => {
    const onUnauthorized = vi.fn();
    await expect(loadAuthorizedClusters(async () => new Response(null, { status: 401 }), "https://c.example", onUnauthorized)).rejects.toThrow();
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    for (const clusters of [[{ id: "../admin", name: "x" }], [{ id: "a/b", name: "x" }], [{ id: "..", name: "x" }], "nope"]) {
      await expect(loadAuthorizedClusters(async () => Response.json({ clusters }), "https://c.example", () => {})).rejects.toThrow("invalid");
    }
  });
});
