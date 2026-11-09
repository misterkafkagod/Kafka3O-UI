import { describe, expect, it, vi } from "vitest";
import { appearanceStorageKey, defaultAppearance } from "./Appearance";
import { createAppearanceStore } from "./createAppearanceStore";

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: vi.fn((key: string, value: string) => { values.set(key, value); }),
    removeItem: vi.fn((key: string) => { values.delete(key); }),
    values,
  };
}

describe("createAppearanceStore", () => {
  it("applies the saved appearance immediately", () => {
    const root = document.createElement("html");
    const store = createAppearanceStore(memoryStorage({ [appearanceStorageKey]: "{\"mode\":\"dark\"}" }), root, new EventTarget() as unknown as Window);
    expect(store.get().appearance.mode).toBe("dark");
    expect(root.dataset.mode).toBe("dark");
  });

  it("applies, saves and announces every change", () => {
    const root = document.createElement("html");
    const storage = memoryStorage();
    const store = createAppearanceStore(storage, root, new EventTarget() as unknown as Window);
    const listener = vi.fn();
    store.subscribe(listener);
    store.update({ mode: "light" });
    expect(root.dataset.mode).toBe("light");
    expect(JSON.parse(storage.values.get(appearanceStorageKey)!)).toEqual({ ...defaultAppearance, mode: "light" });
    expect(store.get()).toEqual({ appearance: { ...defaultAppearance, mode: "light" }, saveFailed: false });
    expect(listener).toHaveBeenCalledOnce();
  });

  it("keeps working and reports when saving fails", () => {
    const root = document.createElement("html");
    const blocked = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); }, removeItem: () => { throw new Error("blocked"); } };
    const store = createAppearanceStore(blocked, root, new EventTarget() as unknown as Window);
    expect(store.get().appearance).toEqual(defaultAppearance);
    store.update({ mode: "dark" });
    expect(root.dataset.mode).toBe("dark");
    expect(store.get().saveFailed).toBe(true);
  });

  it("resets to the defaults and removes the stored entry", () => {
    const root = document.createElement("html");
    const storage = memoryStorage({ [appearanceStorageKey]: "{\"mode\":\"dark\"}" });
    const store = createAppearanceStore(storage, root, new EventTarget() as unknown as Window);
    store.reset();
    expect(store.get().appearance).toEqual(defaultAppearance);
    expect(storage.values.has(appearanceStorageKey)).toBe(false);
    expect(root.hasAttribute("data-mode")).toBe(false);
  });

  it("follows changes made in another tab", () => {
    const root = document.createElement("html");
    const storage = memoryStorage();
    const events = new EventTarget();
    const store = createAppearanceStore(storage, root, events as unknown as Window);
    const listener = vi.fn();
    store.subscribe(listener);
    storage.values.set(appearanceStorageKey, "{\"mode\":\"dark\"}");
    events.dispatchEvent(new StorageEvent("storage", { key: appearanceStorageKey }));
    expect(store.get().appearance.mode).toBe("dark");
    expect(root.dataset.mode).toBe("dark");
    events.dispatchEvent(new StorageEvent("storage", { key: "unrelated" }));
    expect(listener).toHaveBeenCalledOnce();
  });
});
