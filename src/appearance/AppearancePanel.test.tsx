import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { AppearanceContext } from "./AppearanceContext";
import { AppearancePanel } from "./AppearancePanel";
import { createAppearanceStore } from "./createAppearanceStore";

function renderPanel(storage: Parameters<typeof createAppearanceStore>[0]) {
  const root = document.createElement("html");
  const store = createAppearanceStore(storage, root, new EventTarget() as unknown as Window);
  render(<AppearanceContext.Provider value={store}><AppearancePanel /></AppearanceContext.Provider>);
  return { root, store };
}

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}

describe("AppearancePanel", () => {
  it("changes the color mode immediately from the keyboard", async () => {
    const user = userEvent.setup();
    const { root } = renderPanel(memoryStorage());
    await user.click(screen.getByText("Appearance"));
    const group = screen.getByRole("group", { name: "Color mode" });
    expect((within(group).getByRole("radio", { name: "Match system" }) as HTMLInputElement).checked).toBe(true);
    within(group).getByRole("radio", { name: "Match system" }).focus();
    await user.keyboard("{ArrowDown}");
    expect((within(group).getByRole("radio", { name: "Light" }) as HTMLInputElement).checked).toBe(true);
    expect(root.dataset.mode).toBe("light");
    await user.click(within(group).getByRole("radio", { name: "Dark" }));
    expect(root.dataset.mode).toBe("dark");
  });

  it("resets to the defaults", async () => {
    const user = userEvent.setup();
    const { root, store } = renderPanel(memoryStorage());
    store.update({ mode: "dark" });
    await user.click(screen.getByText("Appearance"));
    await user.click(screen.getByRole("button", { name: "Reset appearance" }));
    expect((screen.getByRole("radio", { name: "Match system" }) as HTMLInputElement).checked).toBe(true);
    expect(root.hasAttribute("data-mode")).toBe(false);
  });

  it("says when choices cannot be saved", async () => {
    const user = userEvent.setup();
    const blocked = { getItem: () => null, setItem: () => { throw new Error("blocked"); }, removeItem: () => { throw new Error("blocked"); } };
    const { root } = renderPanel(blocked);
    await user.click(screen.getByText("Appearance"));
    expect(screen.queryByRole("status")).toBeNull();
    await user.click(screen.getByRole("radio", { name: "Dark" }));
    expect(root.dataset.mode).toBe("dark");
    expect(screen.getByRole("status").textContent).toBe("Preferences can't be saved in this browser.");
  });

  it("renders nothing without an appearance store", () => {
    const { container } = render(<AppearancePanel />);
    expect(container.innerHTML).toBe("");
  });
});
